import { Client } from "@opensearch-project/opensearch";
import { config } from "./config.js";
import { telemetry } from "./telemetry.js";

export const os = new Client({
  node: config.opensearch.url,
  ssl: config.opensearch.insecure ? { rejectUnauthorized: false } : undefined,
  requestTimeout: 8000,
  maxRetries: 2,
});
export const INDEX = config.opensearch.index;

const mapping = {
  settings: {
    analysis: {
      filter: { autocomplete_filter: { type: "edge_ngram", min_gram: 2, max_gram: 15 } },
      analyzer: {
        autocomplete: { type: "custom", tokenizer: "standard", filter: ["lowercase", "autocomplete_filter"] },
        autocomplete_search: { type: "custom", tokenizer: "standard", filter: ["lowercase"] },
      },
    },
  },
  mappings: {
    properties: {
      id: { type: "long" },
      sku: { type: "keyword" },
      name: {
        type: "text",
        fields: { autocomplete: { type: "text", analyzer: "autocomplete", search_analyzer: "autocomplete_search" }, raw: { type: "keyword" } },
      },
      brand: { type: "text", fields: { raw: { type: "keyword" } } },
      description: { type: "text" },
      category: { type: "keyword" },
      category_name: { type: "text" },
      price: { type: "double" },
      cities: { type: "keyword" },
      stock: { type: "object", enabled: false },
      total_stock: { type: "integer" },
      image_url: { type: "keyword", index: false },
      created_at: { type: "date" },
    },
  },
};

export async function ensureIndex() {
  const exists = await os.indices.exists({ index: INDEX });
  if (!exists.body) await os.indices.create({ index: INDEX, body: mapping });
}

export async function searchHealth() {
  try {
    const h = await os.cluster.health();
    const exists = await os.indices.exists({ index: INDEX });
    let count = null;
    if (exists.body) count = (await os.count({ index: INDEX })).body.count;
    return { ok: true, status: h.body.status, indexExists: exists.body, documents: count };
  } catch (e) { return { ok: false, error: e.message }; }
}

export async function searchProducts({
  q,
  category,
  subcat,
  city,
  minPrice,
  maxPrice,
  sort,
  page = 1,
  size = 12,
  brand,
  discount,
  deals,
  gender,
  colour,
  itemSize,
}) {
  const must = [];
  const filter = [];
  const isFuzzy = Boolean(q);

  if (q) {
    must.push({
      bool: {
        should: [
          { multi_match: { query: q, fields: ["name^4", "brand^2", "category_name^1.5", "description"], fuzziness: "AUTO", prefix_length: 1, operator: "or" } },
          { match: { "name.autocomplete": { query: q, boost: 2 } } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  if (category) filter.push({ term: { category } });
  if (subcat) {
    if (subcat === "tops") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "shirt OR \"t-shirt\" OR polo OR jacket OR hoodie OR blazer OR tee",
          fields: ["name"],
        },
      });
    } else if (subcat === "bottoms") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "jeans OR chinos OR jogger OR joggers OR trousers OR pants",
          fields: ["name"],
        },
      });
    } else if (subcat === "ethnic") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "kurta OR kurtas OR anarkali OR saree OR dress OR sherwani",
          fields: ["name"],
        },
      });
    } else if (subcat === "shoes") {
      filter.push({ term: { category: "footwear" } });
    } else if (subcat === "accessories") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "bag OR backpack OR satchel OR tote OR watch OR sunglasses OR aviator OR wayfarer OR belt",
          fields: ["name"],
        },
      });
    } else if (subcat === "watches") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "watch OR chronograph",
          fields: ["name"],
        },
      });
    } else if (subcat === "bags") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "bag OR backpack OR satchel OR tote",
          fields: ["name"],
        },
      });
    } else if (subcat === "western") {
      filter.push({ term: { category: "fashion" } });
      must.push({
        query_string: {
          query: "shirt OR jeans OR jacket OR trousers OR blazer OR polo OR tee OR jogger",
          fields: ["name"],
        },
      });
    } else if (subcat === "sportswear") {
      must.push({
        query_string: {
          query: "running OR sport OR athletic OR hoodie OR track OR sneaker",
          fields: ["name", "description"],
        },
      });
    } else if (["audio", "mobiles", "laptops", "home", "fashion", "footwear"].includes(subcat)) {
      filter.push({ term: { category: subcat } });
    }
  }
  if (brand) filter.push({ match: { brand } });
  if (city) filter.push({ term: { cities: city } });
  if (minPrice != null || maxPrice != null) {
    filter.push({ range: { price: { ...(minPrice != null && { gte: minPrice }), ...(maxPrice != null && { lte: maxPrice }) } } });
  }
  if (discount != null) {
    filter.push({ range: { discount_percent: { gte: discount } } });
  }
  if (deals) {
    filter.push({ range: { discount_percent: { gte: 25 } } });
  }
  if (gender) {
    must.push({
      query_string: {
        query: `${gender}* OR ${gender}'s`,
        fields: ["name", "description", "category_name"],
      },
    });
  }
  if (itemSize) {
    must.push({
      match: { sizes: itemSize },
    });
  }
  if (colour) {
    const col = colour.toLowerCase().trim();
    filter.push({
      bool: {
        should: [
          { term: { color: col } },
          { term: { colour: col } },
          { match: { color: col } },
        ],
        minimum_should_match: 1,
      },
    });
  }
  const sortSpec = {
    price_asc: [{ price: "asc" }], price_desc: [{ price: "desc" }], newest: [{ created_at: "desc" }],
  }[sort] || (q ? ["_score", { "name.raw": "asc" }] : [{ "name.raw": "asc" }]);

  const t0 = Date.now();
  const res = await os.search({
    index: INDEX,
    body: {
      from: (page - 1) * size, size, track_total_hits: true,
      query: { bool: { must: must.length ? must : [{ match_all: {} }], filter } },
      sort: sortSpec,
      aggs: {
        categories: { terms: { field: "category", size: 20 } },
        cities: { terms: { field: "cities", size: 20 } },
        price: { stats: { field: "price" } },
      },
    },
  });
  const elapsedMs = Date.now() - t0;
  const b = res.body;

  telemetry.record({
    service: "OPENSEARCH",
    type: "SEARCH_QUERY",
    action: q ? `Fuzzy query: "${q}" in ${city || "all cities"}` : `Browsing catalog in ${city || "all cities"}`,
    status: "QUERY_MATCHED",
    query: q || "",
    took: b.took ?? elapsedMs,
    totalHits: b.hits.total.value,
    fuzziness: isFuzzy ? "AUTO" : "NONE",
    filters: { category: category || "all", city: city || "all", minPrice, maxPrice },
    topScore: b.hits.max_score
  });

  return {
    total: b.hits.total.value,
    took: b.took ?? elapsedMs,
    items: b.hits.hits.map((h) => ({
      ...h._source,
      _score: h._score
    })),
    facets: {
      categories: b.aggregations.categories.buckets.map((x) => ({ slug: x.key, count: x.doc_count })),
      cities: b.aggregations.cities.buckets.map((x) => ({ city: x.key, count: x.doc_count })),
      price: { min: b.aggregations.price.min, max: b.aggregations.price.max },
    },
  };
}

export async function suggest(q) {
  const res = await os.search({
    index: INDEX,
    body: {
      size: 6, _source: ["id", "name", "category_name"],
      query: { bool: { should: [
        { match: { "name.autocomplete": { query: q, boost: 3 } } },
        { match: { name: { query: q, fuzziness: "AUTO", prefix_length: 1 } } },
      ], minimum_should_match: 1 } },
    },
  });
  return res.body.hits.hits.map((h) => h._source);
}
