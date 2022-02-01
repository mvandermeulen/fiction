import { objectId } from "@factor/api"
import { paymentEndpointsMap } from "./endpoints"
import { checkPaymentMethod } from "./subscription"

const manage = paymentEndpointsMap.ManageSubscription
type ManageParams = Parameters<typeof manage.request>[0]
type ManageResult = ReturnType<typeof manage.request>
export const requestCreateSubscription = async (
  args: ManageParams,
): Promise<ManageResult> => {
  const { customerId, paymentMethodId, priceId } = args

  let result = await manage.request({
    customerId,
    paymentMethodId,
    priceId,
    _action: "create",
    idempotencyKey: objectId(),
  })

  const subscription = result.data

  if (
    result.status == "success" &&
    subscription &&
    paymentMethodId &&
    priceId &&
    customerId
  ) {
    const checkArgs = {
      subscription,
      customerId,
      paymentMethodId,
      priceId,
    }
    /**
     * Run through stripe payment checks
     * https://github.com/stripe-samples/subscription-use-cases/blob/master/usage-based-subscriptions/client/script.js
     */
    await checkPaymentMethod(checkArgs)
    /**
     * If successful, retrieving subscription again will update its backend status
     */
    result = await manage.request({
      customerId,
      _action: "retrieve",
      idempotencyKey: objectId(),
      subscriptionId: subscription.id,
    })
  }

  return result
}
