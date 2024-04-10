import { describe, expect, it } from 'vitest'
import { getOptionJsonSchema } from '@fiction/ui'
import { templates } from '.'

describe('minimalProfile', async () => {
  it('has correct schema', async () => {
    const jsonSchema = getOptionJsonSchema(templates[0].settings.options)
    expect(jsonSchema).toMatchInlineSnapshot(`
      {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "additionalProperties": false,
        "properties": {
          "details": {
            "description": "short bullet details, resume contact information",
            "items": {
              "additionalProperties": false,
              "properties": {
                "desc": {
                  "description": "Value for a detail, like "Laguna Beach, CA"",
                  "type": "string",
                },
                "href": {
                  "description": "Link / Route",
                  "type": "string",
                },
                "name": {
                  "description": "Label for a detail, like "Location"",
                  "type": "string",
                },
                "target": {
                  "description": "Target",
                  "enum": [
                    "_self",
                    "_blank",
                  ],
                  "type": "string",
                },
              },
              "required": [
                "name",
                "href",
              ],
              "type": "object",
            },
            "type": "array",
          },
          "detailsTitle": {
            "description": "short bullet details, resume contact information",
            "type": "string",
          },
          "heading": {
            "description": "Primary headline for profile 3 to 8 words",
            "type": "string",
          },
          "mediaItems": {
            "description": "Splash picture in portrait format",
            "items": {
              "additionalProperties": false,
              "properties": {
                "desc": {
                  "description": "Description",
                  "type": "string",
                },
                "href": {
                  "description": "Link / Route",
                  "type": "string",
                },
                "media": {
                  "additionalProperties": false,
                  "description": "Image",
                  "properties": {
                    "format": {
                      "enum": [
                        "url",
                      ],
                      "type": "string",
                    },
                    "url": {
                      "type": "string",
                    },
                  },
                  "required": [
                    "url",
                    "format",
                  ],
                  "type": "object",
                },
                "name": {
                  "description": "Text",
                  "type": "string",
                },
              },
              "required": [
                "media",
                "name",
                "href",
              ],
              "type": "object",
            },
            "type": "array",
          },
          "socials": {
            "description": "social media accounts",
            "items": {
              "additionalProperties": false,
              "properties": {
                "desc": {
                  "description": "Description",
                  "type": "string",
                },
                "href": {
                  "description": "Link / Route",
                  "type": "string",
                },
                "icon": {
                  "description": "Icon",
                  "enum": [
                    "x",
                    "linkedin",
                    "facebook",
                    "instagram",
                    "youtube",
                    "github",
                    "email",
                    "phone",
                    "pinterest",
                    "snapchat",
                    "twitch",
                    "discord",
                    "slack",
                    "snapchat",
                  ],
                  "type": "string",
                },
                "name": {
                  "description": "Text",
                  "type": "string",
                },
                "target": {
                  "description": "Target",
                  "enum": [
                    "_self",
                    "_blank",
                  ],
                  "type": "string",
                },
              },
              "required": [
                "name",
                "icon",
                "href",
              ],
              "type": "object",
            },
            "type": "array",
          },
          "socialsTitle": {
            "description": "social media accounts",
            "type": "string",
          },
          "subHeading": {
            "description": "Formatted markdown of profile with paragraphs, 30 to 60 words, 2 paragraphs",
            "type": "string",
          },
          "superHeading": {
            "description": "Shorter badge above headline, 2 to 5 words",
            "type": "string",
          },
        },
        "required": [
          "mediaItems",
          "heading",
          "subHeading",
          "details",
          "socials",
        ],
        "type": "object",
      }
    `)
  })
})
