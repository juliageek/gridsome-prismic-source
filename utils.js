const DOM = require("prismic-dom")
const marked = require("marked")
const clonedeep = require('lodash.clonedeep')

// fields that don't need any parsing
const SIMPLE_FIELDS = {
  string: 'string',
  boolean: 'boolean',
  number: 'number'
}

// supported link types. For now, all but document links
const LINK_TYPES = {
  media: 'media',
  web: 'web'
}

// all parser types
const PARSER_TYPES = {
  NONE: 'none',
  TEXT: 'text',
  HTML: 'html',
  MARKDOWN: 'markdown',
  OBJECT: 'object',
  NOT_SUPPORTED: 'not_supported'
}

// all header types
const HEADERS = {
  heading1: 'heading1',
  heading2: 'heading2',
  heading3: 'heading3',
  heading4: 'heading4',
  heading5: 'heading5',
  heading6: 'heading6'
}

// function to get the parser type for each field
const getParser = (field) => {
  if (field) {
    if (SIMPLE_FIELDS[typeof field]) {
      return PARSER_TYPES.NONE
    }

    if (typeof field === 'object') {
      // the only array types are headers and rich texts
      // if there's just one item in the array, then we have
      // either markdown text or a header
      if (Array.isArray(field)) {
        if (field.length === 1) {
          if (field[0].type === 'preformatted') {
            return PARSER_TYPES.MARKDOWN
          }

          if (HEADERS[field[0].type]) {
            return PARSER_TYPES.TEXT
          }
        }
        return PARSER_TYPES.HTML
      } else if (field.dimensions || (field.link_type && LINK_TYPES[field.link_type.toLowerCase()])) {
          return PARSER_TYPES.NONE
      } else {
        return PARSER_TYPES.OBJECT
      }
    }
  }

  return PARSER_TYPES.NOT_SUPPORTED
}

const parseText = (data) => {
  return data.value[0].text
}

// TODO: flatten the array of objects to get only the slugs
const parseRelatedProducts = (data) => {
  let slugsArray = []
  data.value.forEach((el) => {
    if(el.link) {
      slugsArray.push(el.link.value.document.slug)
    }
  })
  return slugsArray
}

const parseCategories = (data) => {
  const categoriesArray = [];
  if (data && data.value && data.value.length) {
      data.value.forEach((value) => {
        if (value.link) {
          categoriesArray.push(value.link.value.document.slug);
        }
      })
  }
  return categoriesArray;
}

const parseNumber = (data) => {
  return data.value
}

const parseImage = (data) => {
  return clonedeep(data.value)
}

const parseObject = (data) => {
  const newDataObject = {}
  if(Object.keys(data).length) {
    Object.keys(data).forEach((key) => {
      if (Object.keys(data[key]).length) {
        switch(key) {
          case('title'):
          case('description'):
            newDataObject[key] = parseText(data[key])
            break
          case('categories'):
            newDataObject[key] = parseCategories(data[key])
            break
          case('relatedProducts'):
            newDataObject[key] = parseRelatedProducts(data[key])
            break
          case('image'):
            newDataObject[key] = parseImage(data[key])
            break
          case('price'):
          case('weight'):
            newDataObject[key] = parseNumber(data[key])
            break
          default:
            break
        }
      } else {
        newDataObject[key] = data[key];
      }
    })
  }
  return newDataObject;
}

// function that parses a prismic document to a javascript object
const documentParser = ({
  id,
  slugs,
  data,
  lang
}) => {
  const parsedDocument = {
    id,
    uid: slugs[0],
    slug: slugs[0],
    lang
  }

  const parsedData = {}

  Object.keys(data).forEach((key) => {
    const parserType = getParser(data[key])
    switch (parserType) {
      case PARSER_TYPES.NONE:
        parsedData[key] = data[key]
        break
      case PARSER_TYPES.MARKDOWN:
        parsedData[key] = marked(data[key][0].text)
        break
      case PARSER_TYPES.TEXT:
        parsedData[key] = DOM.RichText.asText(data[key])
        break
      case PARSER_TYPES.HTML:
        parsedData[key] = DOM.RichText.asHtml(data[key])
        break
      case PARSER_TYPES.OBJECT:
        parsedData[key] = parseObject(data[key])
        break
      default:
        break
    }
  })

  Object.keys(parsedData).forEach((key) => {
    parsedDocument.data = parsedData[key]
  })

  return parsedDocument
}

// function to capitalize words
const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

module.exports = { documentParser, capitalize }