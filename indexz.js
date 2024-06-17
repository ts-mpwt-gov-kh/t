import snakecaseKeys from 'snakecase-keys'
import jsdom from 'jsdom'
import axios from "axios";
import { CookieJar } from 'tough-cookie'
import { HttpCookieAgent, HttpsCookieAgent } from 'http-cookie-agent/http'

function createCookieAgents() {
  const jar = new CookieJar();
  return {
    httpAgent: new HttpCookieAgent({ cookies: { jar } }),
    httpsAgent: new HttpsCookieAgent({ cookies: { jar } }),
  }
}

/** 
 * @typedef {{en: string, km: string} | string} LocalePair
 * @typedef {{
 *  plate_no: { "en": "SIEM REAP 3A-2399", "km": "សៀមរាប 3A-2399" },
 *  brand: "HYUNDAI COUNTY",
 *  type: { "en": "HEAVY BUS", "km": "ដឹកអ្នកដំណើរធុនធំ" },
 *  color: { "en": "MILK COLOR", "km": "ទឹកដោះគោ" },
 *  engine_no: "D4D***61727",
 *  frame_no: "KMJHD1******28960",
 *  power: "140",
 *  chassis_no: "NIL",
 *  axle_no: "2",
 *  cylinder_no: "4",
 *  cylinder_size: "3907",
 *  year_made: "2006"
 * }} ParseResult
 * @param {string} url 
 * @returns {Promise<ParseResult>}
 */
export async function parse(url) {
  const client = axios.create(createCookieAgents());
  const { data: html } = await client.get(url, {
    responseType: 'text'
  });

  const dom = new jsdom.JSDOM(html);
  const doc = dom.window.document;

  function createEntries(language) {
    const rows = doc.querySelectorAll(`#${language} table tr`);
    const root = [];
    for (const row of rows) {
      const columns = row.querySelectorAll('td');
      const entries = [];
      for (const col of columns) {
        entries.push(col.textContent.trim())
      };
      root.push(entries);
    }

    return root;
  }

  const englishEntries = createEntries("english")
  const khmerEntries = createEntries("khmer")
  const merged = englishEntries.map(([key, value], index) => {
    const kmValue = khmerEntries[index][1];
    if (value === kmValue) {
      return [key, value]
    }
    return [key, { en: value, km: kmValue }]
  })

  return snakecaseKeys(Object.fromEntries(merged));
}
