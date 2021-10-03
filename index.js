#!/usr/bin/env node
const puppeteer = require('puppeteer')
const ora = require('ora')
const chalk = require('chalk')
const figlet = require('figlet')
const readline = require('readline')
const Table = require("tty-table");

const isPkg = typeof process.pkg !== 'undefined'
const chromiumExecutablePath = isPkg
  ? './chromium/chrome.exe'
  : puppeteer.executablePath()

const speedTestSites = [
  {
    name: 'Speed Test',
    url: 'https://www.speedtest.net',
    startButton: '.js-start-test',
    waitUntil: ['networkidle0', 'domcontentloaded'],
    waitFor: () => {
      return !!document.querySelector('.upload-speed').innerText.trim();
    },
    getResult: async (page) => {
      return {
        ping: await page.$eval('.ping-speed', el => parseFloat(el.innerText)),
        downloadSpeed: await page.$eval('.download-speed', el => parseFloat(el.innerText)),
        uploadSpeed: await page.$eval('.upload-speed', el => parseFloat(el.innerText)),
        server: await page.$eval('.js-data-sponsor', el => el.innerText)
      }
    }
  },
  {
    name: 'Fast',
    url: 'https://fast.com',
    waitUntil: 'domcontentloaded',
    waitFor: () => {
      return !!document.querySelector('.succeeded#speed-value')
    },
    getResult: async (page) => {
      await page.click('#show-more-details-link')
      await page.waitForFunction(() => document.querySelector('.succeeded#upload-value'), { timeout: 0, polling: 2000 })
      return {
        ping: await page.$eval('#latency-value', el => parseFloat(el.innerText)),
        downloadSpeed: await page.$eval('#speed-value', el => parseFloat(el.innerText)),
        uploadSpeed: await page.$eval('#upload-value', el => parseFloat(el.innerText))
      }
    }
  }
];

const generateTable = (data) => {
  const header = [
    {
      value: "name",
      alias: "NAME",
      align: "center",
      formatter: function (value) {
        return this.style(value.toUpperCase(), "green", "bold");
      },
    },
    {
      value: "downloadSpeed",
      alias: "DOWNLOAD SPEED",
      align: "center",
      formatter: (value) => `${value} MB`
    },
    {
      value: "uploadSpeed",
      alias: "UPLOAD SPEED",
      align: "center",
      formatter: (value) => `${value} MB`
    },
    {
      value: "ping",
      alias: "PING",
      align: "center",
    },
    {
      value: "server",
      alias: "SERVER",
      align: "center",
    },
  ];

  const options = {
    borderStyle: "solid",
    borderColor: "blue",
    headerAlign: "center",
    align: "left",
    color: "white",
    truncate: "...",
    width: "90%",
    defaultErrorValue: " - ",
    defaultValue: " - "
  };

  const out = Table(header, data, options).render();
  return out
}

const runSpeedScraper = async () => {
  console.log(chalk.yellow.bold(figlet.textSync('Speed Test\n         Scraper', { horizontalLayout: 'universal smushing', whitespaceBreak: true })));
  console.log();
  console.log(chalk.blue("         Author  : ") + chalk.green("Vitor de Lima Cirqueira"));
  console.log(chalk.blue("         Version : ") + chalk.green("1.1"));
  console.log(chalk.blue("         Github  : ") + chalk.green("https://github.com/vitorlc"));
  console.log();

  const spinner = ora();
  spinner.start(chalk.blue('Iniciando SCRAPER'))

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromiumExecutablePath,
    args: [
      '--no-sandbox',
      '--disable-web-security',
      '--disable-features=site-per-process',
    ],
  })
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1070 })
  spinner.succeed();
  const result = []
  for (let data of speedTestSites) {
    console.log()
    spinner.start(chalk.blue(`Abrindo ${data.name.replace("https://", "")}`)) 
    await page.goto(data.url, { timeout: 0, waitUntil: data.waitUntil })
    spinner.succeed();
    if (data.startButton) await page.click(data.startButton)
    spinner.start(chalk.blue(`${data.name} - Aguardando Testes`)) 
    await page.waitForFunction(data.waitFor, { timeout: 0, polling: 2000 });
    spinner.succeed();
    const resultUrl = await data.getResult(page)
    spinner.start(chalk.blue(`${data.name} - Obtendo Resultados`)) 
    result.push({ name: data.name, ...resultUrl })
    spinner.succeed();
  }
  spinner.stop()
  await browser.close()

  const table = generateTable(result) 
  console.log(chalk.bgBlue.white.bold('\n\n      Resultados:      '))
  console.log(table)

  isPkg &&
    readline
      .createInterface(process.stdin, process.stdout)
      .question('\n\nAperte [Enter] para fechar...', () => process.exit())
}

runSpeedScraper()

