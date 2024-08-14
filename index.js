// openapi: 3.0.3
// info:
//   title: Arxiv API
//   description: |-
//     This is an API for finding research papers based on the users query. It supports keywords with negatives, limits and pagination. Alternatively, it supports a freeform query builder on the Arxiv format, as detailed below straight from the documentation.
//     --CONTEXT--
//     In the arXiv search engine, each article is divided up into a number of fields that can individually be searched. For example, the titles of an article can be searched, as well as the author list, abstracts, comments and journal reference. To search one of these fields, we simply prepend the field prefix followed by a colon to our search term. For example, suppose we wanted to find all articles by the author Adrian Del Maestro. We could construct the following query
//     http://export.arxiv.org/api/query?search_query=au:del_maestro
//     This returns nine results. The following table lists the field prefixes for all the fields that can be searched.
//     prefix explanation
//     ti Title
//     au Author
//     abs Abstract
//     co Comment
//     jr Journal Reference
//     cat Subject Category
//     rn Report Number
//     id Id (use id_list instead)
//     all All of the above
//     Note: The id_list parameter should be used rather than search_query=id:xxx to properly handle article versions. In addition, note that all: searches in each of the fields simultaneously.
//     The API allows advanced query construction by combining these search fields with Boolean operators. For example, suppose we want to find all articles by the author Adrian DelMaestro that also contain the word checkerboard in the title. We could construct the following query, using the AND operator:
//     http://export.arxiv.org/api/query?search_query=au:del_maestro+AND+ti:checkerboard
//     As expected, this query picked out the one of the nine previous results with checkerboard in the title. Note that we included + signs in the urls to the API. In a url, a + sign encodes a space, which is useful since spaces are not allowed in url's. It is always a good idea to escape the characters in your url's, which is a common feature in most programming libraries that deal with url's. Note that the <title> of the returned feed has spaces in the query constructed. It is a good idea to look at <title> to see if you have escaped your url correctly.
//     The following table lists the three possible Boolean operators.
//     AND
//     OR
//     ANDNOT
//     The ANDNOT Boolean operator is particularly useful, as it allows us to filter search results based on certain fields. For example, if we wanted all of the articles by the author Adrian DelMaestro with titles that did not contain the word checkerboard, we could construct the following query:
//     http://export.arxiv.org/api/query?search_query=au:del_maestro+ANDNOT+ti:checkerboard
//     As expected, this query returns eight results.
//     Finally, even more complex queries can be used by using parentheses for grouping the Boolean expressions. To include parentheses in in a url, use %28 for a left-parens (, and %29 for a right-parens ). For example, if we wanted all of the articles by the author Adrian DelMaestro with titles that did not contain the words checkerboard, OR Pyrochore, we could construct the following query:
//     http://export.arxiv.org/api/query?search_query=au:del_maestro+ANDNOT+%28ti:checkerboard+OR+ti:Pyrochlore%29
//     This query returns three results. Notice that the <title> element displays the parenthesis correctly meaning that we used the correct url escaping.
//     So far we have only used single words as the field terms to search for. You can include entire phrases by enclosing the phrase in double quotes, escaped by %22. For example, if we wanted all of the articles by the author Adrian DelMaestro with titles that contain quantum criticality, we could construct the following query:
//     http://export.arxiv.org/api/query?search_query=au:del_maestro+AND+ti:%22quantum+criticality%22
//     This query returns one result, and notice that the feed <title> contains double quotes as expected. The table below lists the two grouping operators used in the API.
//     symbol encoding explanation
//     ( ) %28 %29 Used to group Boolean expressions for Boolean operator precedence.
//     double quotes %22 %22 Used to group multiple words into phrases to search a particular field.
//     space + Used to extend a search_query to include multiple fields.
//     --END CONTEXT--

const express = require('express')
const axios = require('axios').default
const app = express()
const port = 3000

// The ability to parse JSON in the body
app.use(express.json())

/** 
 * NOT an endpoint! Utility function for building queries.
 * @param {String[]} keywords Keywords to search for
 * @param {number} limit Limit of results
 * @param {String[]} negatives Negative keywords to exclude
 * @param {number} start Starting index for the search for pagination. Start at 0
 */
function arxivFormatter(keywords, limit, negatives, start){
    // https://info.arxiv.org/help/api/user-manual.html#51-details-of-query-construction
    let reducer = (acc,cur,index, array) => acc + `all:${cur}` + (index == keywords.length - 1 ? "" : "+AND+")
    
    // Construct the search query
    const positives = keywords.reduce(reducer, "")
    let negatives_query = negatives.reduce(reducer, "")

    if (negatives != "") negatives_query = `+AND+NOT+(${negatives_query})`

    // The final query
    return `search_query=${positives}${negatives_query}&max_results=${limit}&start=${start}`
}

// Strict search - client only gets to control the keywords, limit, start and negatives
app.get('/search/', (req, res) => {

    let keyword_typecheck = req.query["keywords"] instanceof Array || typeof req.query["keywords"] == "string";

    // check if keywords are string[], array of length greater than 0
    if (req.query["keywords"] == undefined || req.query["keywords"].length == 0 || !keyword_typecheck) 
        return res.status(400).send("Missing keywords parameter or incorrect type.")

    let search = req.query["keywords"]
    if (typeof search == "string") search = [search]
    
    let limit = req.query["limit"] ?? 15
    let negatives = req.query["negatives"] ?? []
    if (typeof negatives == "string") negatives = [negatives]
    let start = req.query["start"] ?? 0

    let query = arxivFormatter(search, limit, negatives, start)


    // let query = `search_query=${search}&max_results=${limit}`
    // if (negatives != undefined) query += `&exclude_fields=${negative}`

    axios.get(`https://export.arxiv.org/api/query?${query}`).then((response) => {
        
        res.send(`https://export.arxiv.org/api/query?${query}\n\n` + response.data)
    })
})

// LLM to create the queries
app.get('/freesearch/', (req, res) => {
    if (req.query["keywords"] == undefined || req.query["limit"] == undefined || req.query["negative"] == undefined) return res.status(400).send("Missing search, limit, or negative query parameters")

    let search = req.query["keywords"]
    let limit = req.query["limit"]
    let negative = req.query["negative"]

    let query = `search_query=${search}&max_results=${limit}`
    if (negative != undefined) query += `&exclude_fields=${negative}`

    axios.get(`https://export.arxiv.org/api/query?${query}`).then((response) => {
        res.send(response.data)
    })
})
    
app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})