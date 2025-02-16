import {
  runHooks,
  EndpointMeta,
  EndpointManageAction,
  FactorUser,
  Query,
} from "@factor/api"
import type { EndpointResponse, PrivateUser } from "@factor/api"
import Stripe from "stripe"
import { CustomerData, HookDictionary, ManageSubscriptionResult } from "./types"
import type { FactorStripe } from "."
type RefineResult = {
  customerData?: CustomerData
  user?: PrivateUser
}

abstract class QueryPayments extends Query {
  factorUser: FactorUser
  factorStripe: FactorStripe

  constructor(settings: {
    factorUser: FactorUser
    factorStripe: FactorStripe
  }) {
    super(settings)

    this.factorUser = settings.factorUser
    this.factorStripe = settings.factorStripe
  }

  async refine(
    params: { customerId?: string; userId?: string },
    meta: EndpointMeta,
  ): Promise<RefineResult> {
    const { customerId, userId } = params

    const out: RefineResult = {}

    if (customerId) {
      const r = await this.factorStripe.queries.GetCustomerData.serve(
        { customerId },
        meta,
      )
      out.customerData = r.data
    }

    if (userId) {
      const privateDataResponse =
        await this.factorUser.queries.ManageUser.serve(
          {
            userId,
            _action: "getPrivate",
          },
          meta,
        )
      out.user = privateDataResponse.data
    }

    return out
  }

  async serveRequest(
    params: Parameters<this["run"]>[0],
    meta: EndpointMeta,
  ): Promise<Awaited<ReturnType<this["run"]>> & RefineResult> {
    const result = await this.serve(params, meta)

    if (result?.status == "success") {
      const r = result as Awaited<ReturnType<this["run"]>> & {
        customerId?: string
        userId?: string
      }

      const { customerId, userId } = r

      const fullResponse = await this.refine({ customerId, userId }, meta)

      return { ...r, ...fullResponse }
    } else {
      return result as Awaited<ReturnType<this["run"]>> & RefineResult
    }
  }
}

export class QueryCheckoutSession extends QueryPayments {
  async run(
    params: {
      priceId: string
    },
    meta: EndpointMeta,
  ): Promise<void> {
    const { priceId } = params

    if (!priceId) throw this.stop({ message: "no priceId" })

    const stripe = this.factorStripe.getServerClient()

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
      // the actual Session ID is returned in the query parameter when your customer
      // is redirected to the success page.
      success_url: `${this.factorStripe.checkoutConfig.value.cancelUrl}?sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: this.factorStripe.checkoutConfig.value.cancelUrl,
    })

    if (session.url) {
      meta.response?.redirect(303, session.url)
    }
  }
}

export class QueryManageCustomer extends QueryPayments {
  async run(
    params: {
      customerId?: string
      id?: string
      name?: string
      email?: string
      _action: EndpointManageAction
    },
    _meta: EndpointMeta,
  ): Promise<
    EndpointResponse<Stripe.Customer | Stripe.DeletedCustomer> & {
      customerId: string
      customerData?: CustomerData
    }
  > {
    const stripe = this.factorStripe.getServerClient()

    const { _action, customerId } = params

    let customer: Stripe.Customer | Stripe.DeletedCustomer

    if (_action == "create" || (_action == "retrieve" && !customerId)) {
      const { email = "", name = "", id = "" } = params

      customer = await stripe.customers.create({
        email,
        name,
        metadata: { id },
      })

      await runHooks<HookDictionary>({
        list: this.factorStripe.hooks,
        hook: "onCustomerCreated",
        args: [
          { customer, email, id, name },
          { factorStripe: this.factorStripe },
        ],
      })
    } else if (customerId) {
      customer = await stripe.customers.retrieve(customerId)
    } else {
      throw this.stop("could not get stripe customer")
    }

    return {
      status: "success",
      data: customer,
      customerId: customer.id,
    }
  }
}

export class QueryPaymentMethod extends QueryPayments {
  async run(
    params: {
      customerId: string
      paymentMethodId?: string
      _action: EndpointManageAction
    },
    meta: EndpointMeta,
  ): Promise<
    EndpointResponse<Stripe.ApiList<Stripe.PaymentMethod>> & {
      customerId: string
      customerData?: CustomerData
      setupIntent?: Stripe.SetupIntent
    }
  > {
    const { _action, customerId, paymentMethodId } = params

    if (!_action) throw this.stop({ message: "no _action provided" })
    if (!customerId) throw this.stop({ message: "no customer id" })

    const stripe = this.factorStripe.getServerClient()

    // https://stripe.com/docs/api/setup_intents
    let setupIntent: Stripe.SetupIntent | undefined

    if (paymentMethodId) {
      if (_action == "create") {
        setupIntent = await stripe.setupIntents.create({
          customer: customerId,
          payment_method: paymentMethodId,
          confirm: true,
          description: "CC",
          usage: "off_session",
        })

        await this.serve(
          {
            _action: "setDefault",
            customerId,
            paymentMethodId,
          },
          meta,
        )
      } else if (_action == "setDefault") {
        if (!paymentMethodId) throw this.stop({ message: "no payment id" })
        await stripe.customers.update(customerId, {
          invoice_settings: {
            default_payment_method: paymentMethodId,
          },
        })
      } else if (_action == "delete") {
        await stripe.paymentMethods.detach(paymentMethodId)
      } else if (_action == "attach") {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        })

        await this.serve(
          {
            _action: "setDefault",
            customerId,
            paymentMethodId,
          },
          meta,
        )
      }
    } else if (_action != "retrieve") {
      throw this.stop({ message: `no payment method id for ${_action}` })
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    })

    return { status: "success", data: paymentMethods, customerId, setupIntent }
  }
}

export class QueryListSubscriptions extends QueryPayments {
  async run(
    params: {
      customerId: string
    },
    _meta: EndpointMeta,
  ): Promise<EndpointResponse<Stripe.ApiList<Stripe.Subscription>>> {
    const { customerId } = params

    if (!customerId) throw this.stop({ message: "no customer id" })

    const stripe = this.factorStripe.getServerClient()
    const data = await stripe.subscriptions.list({ customer: customerId })

    return { status: "success", data }
  }
}

export class QueryManageSubscription extends QueryPayments {
  async run(
    params: { customerId: string } & (
      | {
          _action: "create"

          idempotencyKey: string
          priceId: string
          paymentMethodId?: string
          coupon?: string
        }
      | {
          _action: "delete"
          subscriptionId: string
          customerId: string
          note?: string
        }
      | { _action: "retrieve"; customerId?: string; subscriptionId: string }
    ),

    meta: EndpointMeta,
  ): Promise<ManageSubscriptionResult> {
    const { _action, customerId } = params

    if (!_action) throw this.stop({ message: "no _action provided" })

    const stripe = this.factorStripe.getServerClient()

    let sub: Stripe.Subscription | undefined
    let message: string | undefined = undefined
    try {
      if (_action == "create") {
        const { customerId, paymentMethodId, priceId, coupon, idempotencyKey } =
          params

        if (!customerId) throw this.stop({ message: "no customer id" })

        // attach payment method to customer
        if (paymentMethodId && customerId) {
          await this.factorStripe.queries.ManagePaymentMethod.serve(
            {
              customerId,
              paymentMethodId,
              _action: "attach",
            },
            meta,
          )
        }

        let args: Stripe.SubscriptionCreateParams = {
          customer: customerId,
          items: [{ price: priceId }],
          coupon,
          expand: ["latest_invoice.payment_intent"],
          trial_period_days: 14,
        }

        const hookResult = await runHooks<
          HookDictionary,
          "beforeCreateSubscription"
        >({
          list: this.factorStripe.hooks,
          hook: "beforeCreateSubscription",
          args: [args, { factorStripe: this.factorStripe }],
        })

        if (hookResult) {
          args = hookResult
        }

        sub = await stripe.subscriptions.create(args, { idempotencyKey })

        const suffix = coupon ? ` with code ${coupon}` : ""
        message = `subscription created ${suffix}`
      } else if (_action == "retrieve") {
        const { subscriptionId } = params
        if (!subscriptionId) throw this.stop({ message: "no subscription id" })

        sub = await stripe.subscriptions.retrieve(subscriptionId)
      } else if (_action == "delete") {
        const { subscriptionId, customerId, note } = params
        if (!subscriptionId) throw this.stop({ message: "no subscription id" })

        sub = await stripe.subscriptions.del(subscriptionId)
        await stripe.customers.update(customerId, {
          metadata: { cancelReason: note ?? "" },
        })
        message = "subscription deleted"
      }
    } catch (error: unknown) {
      const e = error as Error
      throw this.stop({ message: e.message })
    }

    if (sub) {
      await runHooks<HookDictionary, "onSubscriptionUpdate">({
        list: this.factorStripe.hooks,
        hook: "onSubscriptionUpdate",
        args: [sub, { factorStripe: this.factorStripe }],
      })
    }

    return {
      status: "success",
      data: sub,
      customerId,
      userId: meta.bearer?.userId,
      message,
    }
  }
}

export class QueryGetInvoices extends QueryPayments {
  async run(
    params: {
      customerId: string
      limit?: number
      startingAfter?: string
    },
    _meta: EndpointMeta,
  ): Promise<
    EndpointResponse<Stripe.ApiList<Stripe.Invoice>> & {
      customerId: string
      customerData?: CustomerData
    }
  > {
    const { customerId, startingAfter, limit } = params
    const stripe = this.factorStripe.getServerClient()
    const data = await stripe.invoices.list({
      customer: customerId,
      starting_after: startingAfter,
      limit,
    })

    return { status: "success", data, customerId }
  }
}

export class QueryGetProduct extends QueryPayments {
  async run(
    params: {
      productId: string
    },
    _meta: EndpointMeta,
  ): Promise<EndpointResponse<Stripe.Product>> {
    const { productId } = params
    const stripe = this.factorStripe.getServerClient()
    const product = await stripe.products.retrieve(productId)

    return { status: "success", data: product }
  }
}

export class QueryAllProducts extends QueryPayments {
  async run(
    _params: undefined,
    _meta: EndpointMeta,
  ): Promise<EndpointResponse<Stripe.Product[]>> {
    const products = this.factorStripe.products.value

    const productIds = products
      .map((_) => _.productId)
      .filter(Boolean) as string[]

    const responsePlans = await Promise.all(
      productIds.map((productId: string) =>
        this.factorStripe.queries.GetProduct.serve({ productId }, {}),
      ),
    )
    const data = responsePlans
      .map((product) => product.data)
      .filter(Boolean) as Stripe.Product[]

    return { status: "success", data }
  }
}

export class QueryGetCoupon extends QueryPayments {
  async run(
    {
      couponCode,
    }: {
      couponCode: string
    },
    _meta: EndpointMeta,
  ): Promise<EndpointResponse<Stripe.Response<Stripe.Coupon>>> {
    if (!couponCode) throw this.stop({ message: "no code was provided" })

    const stripe = this.factorStripe.getServerClient()

    try {
      const data = await stripe.coupons.retrieve(couponCode)
      return { status: "success", data }
    } catch (error: unknown) {
      throw this.stop({
        message: "payment API error",
        data: error as Error,
      })
    }
  }
}

export class QueryGetCustomerData extends QueryPayments {
  async run(
    {
      customerId,
    }: {
      customerId: string
    },
    meta: EndpointMeta,
  ): Promise<EndpointResponse<CustomerData>> {
    const [customer, subscriptions] = await Promise.all([
      this.factorStripe.queries.ManageCustomer.serve(
        { customerId, _action: "retrieve" },
        meta,
      ),
      this.factorStripe.queries.ListSubscriptions.serve({ customerId }, meta),
      this.factorStripe.queries.GetInvoices.serve({ customerId }, meta),
      this.factorStripe.queries.ManagePaymentMethod.serve(
        { customerId, _action: "retrieve" },
        meta,
      ),
      this.factorStripe.queries.AllProducts.serve(undefined, meta),
    ])

    const data: CustomerData = {
      subscriptions: subscriptions.data?.data ?? [],
      customer: customer.data,
    }
    return { status: "success", data }
  }
}
