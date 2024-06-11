const { promises: { writeFile, readFile } } = require('fs')
const postmanToOpenApi = require('postman-to-openapi')
const { dump, load } = require('js-yaml')

const postmanCollection = '../public/doc/gimmy.postman_collection.json'
const outputFile = '../public/doc/gimmy-openapi.yml'

// x-logo:
//         url: 'https://thais-pms.com/_nuxt/img/1aba678.svg'
//         altText: Thais logo

// Promise callback style
postmanToOpenApi(postmanCollection, null, {
    defaultTag: 'Autres',
    servers: [
        {
            url: 'https://demo.hotel-data.fr/',
            description: 'Demo environment server',
        },
        {
            url: 'http://demo.hotel-data.local/',
            description: 'Local dev environment server',
        },
    ],
    // info: {
    //     'x-logo': {
    //         url: 'https://thais-pms.com/_nuxt/img/1aba678.svg',
    //         altText: 'Thais logo',
    //     },
    // },
})
    .then(async (openApiYml) => {
        const openApi = load(openApiYml, 'utf8')

        // add logo
        openApi.info['x-logo'] = {
            url: '/images/logo.svg',
            altText: 'pds',
        }

        // add responses examples
        const collection = JSON.parse(await readFile(postmanCollection))
        for (const tag of collection.item) {
            for (const item of tag.item) {
                const path = '/' + item.request.url.path.join('/').replace(/{{/g, '{').replace(/}}/g, '}')
                const method = item.request.method.toLowerCase()


                for (const current of item.response) {
                    if (!openApi.paths[path][method].responses[current.code]) {
                        openApi.paths[path][method].responses[current.code] = {
                            content: {
                                'application/json': {
                                    examples: {}
                                }
                            }
                        }
                    }

                    openApi.paths[path][method].responses[current.code].content['application/json'].examples = openApi.paths[path][method].responses[current.code].content['application/json'].examples || {}

                    openApi.paths[path][method].responses[current.code].content['application/json'].examples[current.name] = {
                        value: JSON.parse(current.body)
                    }
                }
            }
        }

        openApiYml = dump(openApi, { skipInvalid: true })
        await writeFile(outputFile, openApiYml, 'utf8')
        // console.log(`OpenAPI specs ok`)
    })
    .catch((err) => {
        console.log(err)
    })
