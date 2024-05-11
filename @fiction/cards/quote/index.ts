import { vue } from '@fiction/core'
import { CardTemplate, createCard } from '@fiction/site'
import { z } from 'zod'
import { InputOption } from '@fiction/ui'
import { standardOption } from '../inputSets'
import franklin from './franklin.jpg'
import socrates from './socrates.jpg'

const MediaSchema = z.object({
  url: z.string().optional(),
  html: z.string().optional(),
  format: z.enum(['html', 'url']).optional(),
}).optional()

const QuoteSchema = z.object({
  text: z.string(),
  author: z.object({
    name: z.string(),
    title: z.string().optional(),
    image: MediaSchema,
    href: z.string().optional(),
  }).optional(),
  org: z.object({
    name: z.string().optional(),
    image: MediaSchema,
    href: z.string().optional(),
  }).optional(),
}).optional()

export type Quote = z.infer<typeof QuoteSchema>
const defaultQuote: Quote[] = [{
  text: 'An investment in knowledge pays the best interest.',
  author: {
    name: 'Benjamin Franklin',
    title: 'Founding Father',
    image: { url: franklin, format: 'url' },
  },
  org: {
    name: 'Fiction',
    image: {
      format: 'html',
      html: `<svg viewBox="0 0 193 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M186.346 19.3908L182.323 13.5788L181.651 13.8028L185.674 19.8388L186.346 19.3908ZM189.922 16.7078L182.098 22.7428V25.4268L185.004 28.1088L188.133 25.6498L180.981 31.4608L176.51 27.8848V15.5898C179.194 15.1428 182.545 13.5778 185.674 10.8958L189.922 16.7078ZM185.451 19.8378L182.097 14.9198V22.5198L185.451 19.8378ZM181.428 30.5658L177.405 27.4368V15.5898H176.735V27.8828L180.981 31.2368L181.428 30.5658ZM173.381 13.5778H170.252V14.4718H172.711L173.381 13.5778ZM169.805 30.5658L165.782 27.4368V13.5778H162.428L161.758 14.4718H164.887V27.6598L169.135 31.2358L169.805 30.5658ZM175.84 26.0958L169.135 31.4588L164.664 27.8828V14.6958H161.535V14.4718L163.992 11.1188H164.664V9.10682L163.992 7.76582C166.676 7.31882 168.687 3.96582 170.699 3.96582C171.146 3.96582 171.594 3.96582 171.816 4.18982C170.921 5.08382 170.252 6.20082 170.252 7.76582V11.1188H175.393L172.934 14.6948H170.252V25.4248L173.158 27.8818L175.615 26.0948L175.84 26.0958ZM165.781 11.1198V8.66082L165.111 7.54382C164.886 7.76682 164.216 7.99081 164.216 7.99081L164.886 9.10882V11.1208L165.781 11.1198Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M160.416 13.5778H157.287V14.4718H159.746L160.416 13.5778ZM156.84 30.5658L152.817 27.4368V13.5778H149.465L148.793 14.4718H151.924V27.6598L156.17 31.2358L156.84 30.5658ZM162.875 26.0958L156.17 31.4588L151.699 27.8828V14.6958H148.57V14.4718L151.029 11.1188H151.699V9.10682L151.029 7.76582C153.711 7.31882 155.722 3.96582 157.734 3.96582C158.181 3.96582 158.629 3.96582 158.851 4.18982C157.956 5.08382 157.287 6.20082 157.287 7.76582V11.1188H162.428L159.969 14.6948H157.287V25.4248L160.193 27.8818L162.652 26.0948L162.875 26.0958ZM152.816 11.1198V8.66082L152.146 7.54382C151.923 7.76682 151.251 7.99081 151.251 7.99081L151.923 9.10882V11.1208L152.816 11.1198ZM140.301 30.3418L136.278 27.2128V15.1428C136.053 15.3658 135.831 15.3658 135.606 15.3658V27.4368L139.629 30.7888L140.301 30.3418ZM148.57 16.4838L140.746 22.5198V25.2018L143.652 27.6608L146.781 25.2018L147.006 25.4268L139.629 31.0148L135.383 27.6608V15.1428C137.842 14.6958 141.194 13.3538 144.547 10.4488L148.57 16.4838ZM144.324 19.6128L140.97 14.6958L140.745 22.2948L144.324 19.6128ZM144.994 18.9428L140.971 13.1308L140.301 13.5778L144.324 19.6128L144.994 18.9428ZM128.453 30.5658C127.336 29.6708 125.099 29.0018 123.76 29.0018C122.418 29.0018 121.078 29.4488 119.737 30.1188C120.632 29.8938 122.196 29.8938 123.313 29.8938C125.325 29.8938 126.442 30.3408 127.784 31.2358L128.453 30.5658ZM128.23 15.5898C127.111 15.8138 125.771 15.8138 124.654 15.8138C122.865 15.8138 120.631 15.3668 119.066 14.2498L118.171 14.9198C119.958 16.0378 121.747 16.4838 123.982 16.4838C125.547 16.4838 126.666 16.0368 128.23 15.5898ZM134.488 26.0958L128.006 31.4588C126.666 30.5658 125.547 30.1188 123.313 30.1188C121.301 30.1188 119.29 30.5658 117.725 31.0138H117.5L123.76 22.9668H118.842L121.971 18.7188H126.889L129.348 15.3658C127.559 16.2598 125.772 16.7068 123.983 16.7068C121.749 16.7068 119.737 16.0368 118.172 14.9188L116.608 16.2598H116.383L122.865 10.8958C124.429 12.0138 125.994 12.4598 128.23 12.4598C129.794 12.2368 131.359 12.0128 132.253 11.5658V11.7898L127.11 18.7188L132.253 18.4958H132.476L129.122 22.7418L123.981 22.9668L121.299 26.3188C122.863 25.8718 124.653 25.4258 126.217 25.4258C128.451 25.4258 130.686 26.0958 132.252 27.6598L134.264 25.8708L134.488 26.0958ZM129.57 21.8498H119.736L119.066 22.7428H128.9L129.57 21.8498Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M113.031 30.5659L109.23 27.6599V16.7079L106.101 14.0259L105.206 14.4729L108.56 17.1549V28.1079L112.359 31.0139L113.031 30.5659ZM118.395 26.5429L112.36 31.2359L108.337 28.1069L103.421 31.4589C100.515 29.6719 98.7256 27.4379 98.7256 24.5309C98.7256 20.2829 101.185 18.7189 104.091 18.7189C105.431 18.7189 106.103 19.1659 106.55 19.8379C106.103 17.6019 104.538 15.8139 102.974 15.3659C100.738 14.2489 99.8426 14.0249 99.8426 12.6839C99.8426 11.3429 100.962 10.8959 101.855 10.8959C102.974 10.8959 103.867 11.5659 103.867 12.4599C103.867 13.5779 103.197 14.2489 102.527 14.4719C102.75 14.6959 102.974 14.6959 103.422 14.6959C105.656 14.6959 107.668 12.4609 109.01 10.6729L113.703 14.4729V25.4269L116.385 27.8839L118.395 26.5429ZM108.336 27.6599V17.3779L105.207 14.4719C104.537 14.9189 104.09 14.9189 103.42 14.9189H102.748C105.43 15.8129 106.996 18.9429 106.996 21.1769C106.996 22.2939 106.549 22.9659 106.101 23.1889H105.876C106.323 22.7419 106.771 22.2939 106.771 21.1769C106.771 19.6129 105.876 19.3899 104.984 19.3899C103.865 19.3899 103.642 20.2829 103.642 21.8489C103.642 25.6479 106.101 28.1069 107.665 28.1069C107.889 28.1069 108.113 28.1069 108.336 27.6599ZM104.09 30.5659C101.631 29.4489 99.8416 26.5429 99.8416 24.5309C99.8416 22.2949 100.289 20.9549 100.961 19.8379C100.066 20.5079 98.9486 21.8499 98.9486 24.5309C98.9486 27.6599 100.961 29.8939 103.42 31.2359L104.09 30.5659ZM71.9026 24.3069C74.1376 28.3299 78.1606 30.3419 81.9606 30.7889C78.8316 29.8939 75.2546 27.8829 73.2436 24.3069H77.4906C78.1606 25.2019 78.6076 26.3189 79.5026 26.9909L79.7256 26.7659V24.3069H79.9496V26.5429L80.8436 26.0959V24.3069H83.7496L79.5026 27.2129C81.0666 28.7769 83.5256 30.1189 85.5376 30.1189C85.9846 30.1189 86.6556 29.8939 87.1026 29.8939V24.3059H87.3266V29.6709C87.5496 29.6709 87.7736 29.4479 88.2206 29.4479V24.3049H88.4436V29.2229C90.2316 28.3279 91.5726 26.0939 92.2436 24.3049H92.4676C92.0206 25.8689 91.1266 27.2109 90.0096 28.1059L90.2326 28.3289C91.3506 27.6589 92.6916 26.3169 93.3626 24.3059H97.3866C95.5976 28.7769 89.7856 31.2359 85.0926 31.2359C79.0576 31.2359 74.1396 28.7769 71.6816 24.3059L71.9026 24.3069Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M71.6791 24.3068C70.7841 22.5198 70.3381 20.2838 70.3381 17.8268C70.3381 7.99078 78.1611 4.41378 82.6311 3.96778L82.8551 4.41478C79.2791 6.20278 77.0431 8.66178 76.1491 13.1328L89.5601 3.96778C90.4541 5.30878 91.5721 5.75578 92.6891 5.75578C94.7011 5.75578 96.2651 5.53278 97.3841 4.86178L97.6071 5.08578C91.1251 10.6738 87.9961 13.5798 87.9961 13.5798C92.2431 13.3558 98.0551 14.6978 98.0551 21.1798C98.0551 22.2968 97.8301 23.1918 97.3851 24.3088H93.3611C93.5841 23.4158 93.5841 22.7448 93.5841 21.8518C93.5841 17.1568 90.4551 15.8158 88.8901 15.5918C90.6781 16.4858 92.6901 18.2738 92.6901 21.8518C92.6901 22.7448 92.4661 23.4158 92.4661 24.3088H92.2421V23.8618C91.5721 23.4168 91.1251 23.1918 90.4541 23.1918C89.7841 23.1918 88.8901 23.4168 88.4421 23.8618V24.3088H88.2201V15.5898C87.7731 15.5898 87.7731 15.3658 87.3261 15.3658V24.3058H87.1021V15.3658H86.6551C86.2081 15.3658 85.7611 15.5898 85.3141 15.8128V23.1888L83.7491 24.3058H80.8431V10.2258L79.9491 10.6728V24.3068H79.7251V10.8958L76.1491 13.3538C76.1491 14.2488 75.9251 15.1428 75.9251 16.7068C75.9251 19.3898 76.5951 22.0718 77.4901 24.3058H73.2431C72.1251 22.2938 71.4551 20.2828 71.4551 17.6008C71.4551 12.4598 73.0191 10.2248 74.5841 7.98978H74.3611C73.0201 9.10778 70.5611 12.4598 70.5611 17.8258C70.5611 20.2828 71.0081 22.5188 71.9021 24.3058L71.6791 24.3068ZM93.5841 8.21278C92.6901 8.43678 92.0201 8.65978 89.7841 8.65978C87.5481 8.65978 86.2081 7.54278 85.5371 6.87178L84.6431 7.31878C85.9841 8.65978 87.1021 9.55378 89.3371 9.55378C91.1251 9.55478 92.4661 9.10778 93.5841 8.21278ZM92.9141 9.10778C92.0201 9.33178 90.9021 9.77778 89.1141 9.77778C87.5491 9.77778 86.2081 8.88378 85.3141 8.21278V15.3658L92.9141 9.10778ZM92.2431 20.0608C91.5731 17.8268 90.2311 16.2608 88.4431 15.5898V20.0608C88.8901 20.5078 89.7841 20.9558 90.4551 20.9558C91.1251 20.9548 91.5721 20.7298 92.2431 20.0608ZM92.4661 21.8498C92.4661 21.4028 92.4661 20.9548 92.2421 20.2838C92.0191 20.7308 91.3481 21.1788 90.4541 21.1788C89.5601 21.1788 88.8901 20.7318 88.4421 20.5088V23.6378C88.8891 23.1908 89.5601 22.9678 90.4541 22.9678C91.3491 22.9678 92.0191 23.4148 92.2421 23.6378C92.4661 22.9668 92.4661 22.5198 92.4661 21.8498ZM60.9501 18.7188L56.9261 12.9078L56.2561 13.3548L60.2791 19.1668L60.9501 18.7188ZM64.5261 16.0368L56.7031 22.2948V24.9788L59.6091 27.4378L62.7381 24.9788H62.9622L55.5861 30.7898L51.1161 27.2138V14.9188C53.7981 14.4718 57.1512 13.1308 60.5042 10.2248L64.5261 16.0368ZM60.0561 19.3908L56.7031 14.4728V22.0728L60.0561 19.3908ZM56.2561 30.1188L52.2332 26.9898V14.9188C51.7862 14.9188 51.5622 14.9188 51.3382 15.1428V27.2128L55.5851 30.5668L56.2561 30.1188ZM35.2451 30.5658L31.2221 27.4368V7.76678L30.5521 6.64878L29.8811 7.09578L30.5521 7.98978V27.8828L34.5751 31.2368L35.2451 30.5658ZM50.4451 26.5428L44.4101 31.4588L39.9391 27.8828V16.4838L37.0331 14.2488L35.6922 15.3658V24.9778L39.0451 27.8818L34.5751 31.4578L30.3281 27.8818V8.21278L29.4341 6.87178C32.1161 6.20078 34.1281 3.07178 36.3631 3.07178C36.5871 3.07178 37.0331 3.07178 37.2571 3.29578C36.3631 3.96578 35.6931 5.08378 35.6931 6.87178V15.1428L41.2811 10.6718L45.5281 13.8018V24.9778L48.4341 27.8818L50.4461 26.3178L50.4451 26.5428ZM44.8571 30.5658L41.0571 27.4368V16.0368L37.9282 13.5778L37.2581 14.0248L40.1642 16.4828V27.8818L44.4111 31.2358L44.8571 30.5658ZM4.17615 20.9548C4.40015 26.7658 9.76415 31.4588 15.1291 31.4588H16.2471C10.2121 31.2358 5.29415 26.3178 5.07115 20.9548H9.54215C10.2121 23.4138 11.7771 25.4258 14.0121 26.5428L14.4591 26.3178L15.3531 25.6478V20.9548H19.8231V22.7418L14.2351 26.7648C15.5761 27.2118 17.3641 27.6598 19.1521 27.6598C20.2691 27.6598 21.8341 27.2128 23.1751 26.9898V20.9548V26.7658C23.6221 26.5428 23.8451 26.5428 24.2921 26.3188V20.9558H24.5161V26.3188C26.0801 25.4258 27.6451 24.0848 28.5391 22.7428L28.7631 22.9678C26.5281 27.8838 23.1751 31.6848 15.1281 31.6848C9.54015 31.6848 4.17515 26.9918 3.95215 20.9558L4.17615 20.9548Z" fill="currentColor"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M3.95296 20.9549V20.7299C3.95296 17.8259 4.62296 15.8129 5.74096 14.0249C4.17596 13.5779 2.83496 12.9069 2.83496 10.6719C2.83496 6.4249 6.18796 3.2959 10.211 3.2959C15.352 3.2959 21.163 6.8719 24.516 6.8719C26.975 6.8719 27.869 5.3079 28.092 3.7429H28.316C28.316 3.9659 28.54 4.4129 28.54 4.8599C28.54 7.0949 27.199 10.0009 24.517 10.8949V20.9539H24.293V10.8959C23.846 11.1199 23.623 11.1199 23.176 11.1199H22.281C21.387 11.1199 20.717 11.1199 19.823 10.8959V20.9549H15.353V13.8019L14.459 14.4719L9.31796 18.0489V19.1659C9.31796 19.8379 9.31796 20.5079 9.54196 20.9549H5.06996V20.5079C5.06996 17.6019 5.29396 15.8139 6.63396 13.1319C4.84596 15.3669 4.17596 18.0489 4.17596 20.7309V20.9559L3.95296 20.9549ZM19.375 10.8959C15.575 9.7779 10.658 7.5429 7.52896 7.5429C5.06996 7.5429 3.05796 9.1069 3.05796 10.8959C3.05796 12.6849 4.17596 13.5779 5.74096 13.8019C8.19896 10.6719 10.658 9.7779 13.341 9.3309L13.564 9.5539C10.659 11.7889 9.76396 14.0249 9.31696 17.8249L19.375 10.8959ZM26.528 9.3319C25.411 10.0019 24.293 10.2259 22.952 10.2259C18.705 10.2259 11.553 6.6489 7.97596 6.6489C6.18796 6.6489 5.06996 7.5439 4.84696 7.9899C5.29396 7.7659 6.18796 7.3199 7.75296 7.3199C11.776 7.3199 18.258 10.8959 22.505 10.8959C24.292 10.8959 25.857 10.2259 26.528 9.3319Z" fill="currentColor"/>
</svg>`,
    },
  },
}, {
  text: 'The only true wisdom is in knowing you know nothing.',
  author: {
    name: 'Socrates',
    title: 'Philosopher',
    image: { url: socrates, format: 'url' },
  },
  org: {
    name: 'Dialectic',
    image: {
      format: 'html',
      html: `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" image-rendering="optimizeQuality" fill-rule="evenodd" clip-rule="evenodd" viewBox="0 0 512 506.522"><path fill="currentColor" fill-rule="nonzero" d="M0 392.217h13.513c.973 17.285 6.086 29.337 15.338 36.153 9.251 6.818 23.98 10.226 44.188 10.226h99.697l-.73-24.468c-38.711-7.791-74.013-29.337-105.906-64.639-31.893-35.302-47.84-79.855-47.84-133.66 0-59.648 22.216-110.531 66.647-152.65C129.339 21.06 187.344.001 258.922 0c69.386.001 126.112 19.904 170.179 59.709 44.066 39.807 66.099 90.75 66.1 152.833-.001 50.397-13.695 93.185-41.084 128.365-27.39 35.18-64.457 59.587-111.201 73.221l-3.652 24.468h101.523c23.129 0 38.406-4.382 45.832-13.147 7.425-8.764 11.381-19.842 11.869-33.232H512v114.305H307.492l9.495-110.288c62.813-19.72 94.219-77.786 94.22-174.197-.001-63.056-15.399-111.383-46.197-144.981-30.798-33.598-66.891-50.396-108.28-50.397-44.066.001-80.525 17.834-109.375 53.501-28.85 35.667-43.275 81.256-43.275 136.764 0 40.172 6.452 76.752 19.355 109.741 12.904 32.989 37.615 56.178 74.134 69.569l6.939 110.288H0V392.217z"/></svg>`,
    },
  },
}]

const UserConfigSchema = z.object({
  quotes: z.array(QuoteSchema).optional(),
})

export type UserConfig = z.infer<typeof UserConfigSchema>
const templateId = 'quotes'
export const templates = [
  new CardTemplate({
    templateId,
    category: ['marketing'],
    description: 'A quote card with author and organization information',
    icon: 'i-tabler-quote',
    colorTheme: 'green',
    el: vue.defineAsyncComponent(() => import('./ElQuote.vue')),
    isPublic: true,
    options: [
      standardOption.ai(),
      new InputOption({
        input: 'InputList',
        key: `quotes`,
        options: [
          new InputOption({ key: 'text', label: 'Quote Text', input: 'InputText' }),
          new InputOption({ key: 'author.name', label: 'Author', input: 'InputText' }),
          new InputOption({ key: 'author.title', label: 'Title', input: 'InputText' }),
          new InputOption({ key: 'author.image', label: 'Author Image', input: 'InputMedia' }),
          new InputOption({ key: 'author.href', label: 'Author Link', input: 'InputUrl' }),
          new InputOption({ key: 'org.name', label: 'Organization', input: 'InputText' }),
          new InputOption({ key: 'org.image', label: 'Organization Image', input: 'InputMedia' }),
          new InputOption({ key: 'org.href', label: 'Organization Link', input: 'InputUrl' }),
        ],
      }),
    ],
    schema: UserConfigSchema,
    userConfig: { quotes: defaultQuote },
  }),
] as const

export function demo() {
  return createCard({
    slug: `card-${templateId}`,
    cards: [
      createCard({ templateId, templates, userConfig: { } }),
    ],
  })
}
