#!/usr/bin/env node
const puppeteer = require("puppeteer");

const speedTestSites = [
  {
    url: 'https://www.minhaconexao.com.br',
    waitUntil: ['networkidle0', 'domcontentloaded'],
    waitFor: () => {
      return !!document.querySelector('iframe[title="Velocímetro"]').contentWindow.document.querySelector('#result_text_upload') &&
        !!document.querySelector('iframe[title="Velocímetro"]').contentWindow.document.querySelector('#result_text_upload').innerText.length != 0
    },
    getResult: (page) => {
      return page.evaluate(() => {
        const frame = document.querySelector('iframe[title="Velocímetro"]').contentWindow.document
        return {
          ping: frame.querySelector('#result_text_ping').innerText,
          downloadSpeed: frame.querySelector('#result_text_download').innerText,
          uploadSpeed: frame.querySelector('#result_text_upload').innerText
        }
      })
    }
  },
  {
    url: 'https://fast.com',
    waitUntil: 'domcontentloaded',
    waitFor: () => {
      return !!document.querySelector('.succeeded#speed-value')
    },
    getResult: async (page) => {
      await page.click('#show-more-details-link')
      await page.waitForFunction(() => document.querySelector('.succeeded#upload-value'), { timeout: 0, polling: 2000 })
      return {
        ping: await page.$eval('#latency-value', el => el.innerText),
        downloadSpeed: await page.$eval('#speed-value', el => el.innerText),
        uploadSpeed: await page.$eval('#upload-value', el => el.innerText)
      }
    }
  },
  {
    url: 'https://www.speedtest.net',
    startButton: '.js-start-test',
    waitUntil: ['networkidle0', 'domcontentloaded'],
    waitFor: () => {
      return !!document.querySelector('.upload-speed').innerText.trim();
    },
    getResult: async (page) => {
      return {
        ping: await page.$eval('.ping-speed', el => el.innerText),
        downloadSpeed: await page.$eval('.download-speed', el => el.innerText),
        uploadSpeed: await page.$eval('.upload-speed', el => el.innerText)
      }
    }
  }
];

const runSpeedScraper = async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-web-security', '--disable-features=site-per-process'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1070 })
  const result = []
  for (let data of speedTestSites) {
    await page.goto(data.url, { waitUntil: data.waitUntil })
    if (data.startButton) await page.click(data.startButton)
    await page.waitForFunction(data.waitFor, { timeout: 0, polling: 2000 });
    const resultUrl = await data.getResult(page)
    result.push({ url: data.url, ...resultUrl })
  }
  console.log(result)
  await browser.close()
}

runSpeedScraper()

