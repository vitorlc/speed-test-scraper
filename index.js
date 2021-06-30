#!/usr/bin/env node
const puppeteer = require("puppeteer");
const ora = require('ora');
const chalk = require('chalk');
const figlet = require('figlet');

const speedTestSites = [
  {
    name: 'Minha Conexão',
    url: 'https://www.minhaconexao.com.br',
    waitUntil: ['networkidle0', 'domcontentloaded'],
    waitFor: () => {
      return !!document.querySelector('table > tbody > tr')
    },
    getResult: async (page) => {
      return {
        ping: await page.$eval('table > tbody > tr > td:nth-child(5)', el => parseFloat(el.innerText.replace(",", "."))),
        downloadSpeed: await page.$eval('table > tbody > tr > td:nth-child(6)', el => parseFloat(el.innerText.replace(",", "."))),
        uploadSpeed: await page.$eval('table > tbody > tr > td:nth-child(7)', el => parseFloat(el.innerText.replace(",", "."))),
        server: await page.$eval('table > tbody > tr > td:nth-child(4)', el => el.innerText)
      }
    }
  },
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

const runSpeedScraper = async () => {
  console.log(chalk.yellow.bold(figlet.textSync('Speed Test\n         Scraper', { horizontalLayout: 'universal smushing', whitespaceBreak: true })));
  console.log();
  console.log(chalk.blue("         Author  : ") + chalk.green("Vitor de Lima Cirqueira"));
  console.log(chalk.blue("         Version : ") + chalk.green("1.1"));
  console.log(chalk.blue("         Github  : ") + chalk.green("https://github.com/vitorlc"));
  console.log();

  const spinner = ora();
  spinner.start(chalk.blue('Iniciando SCRAPER'))

  const browser = await puppeteer.launch({ headless: false, args: ['--no-sandbox', '--disable-web-security', '--disable-features=site-per-process'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 1070 })
  spinner.succeed();
  const result = []
  for (let data of speedTestSites) {
    console.log()
    spinner.start(chalk.blue(`Abrindo ${data.name.replace("https://", "")}`)) 
    await page.goto(data.url, { waitUntil: data.waitUntil })
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

  console.log(chalk.bgBlue.white.bold('\n\n      Resultados:      '))
  result.forEach((data) => {
    console.log()
    console.log(chalk.bgBlue.white.bold(`      ${data.name}      `))
    console.log(chalk.yellow.bold(`Download: ${data.download}`))
    console.log(chalk.yellow.bold(`Upload  : ${data.upload}`))
    console.log(chalk.yellow.bold(`Ping    : ${data.ping}`))
    console.log(chalk.yellow.bold(`Servidor: ${data.server || '-'}`))
  })
}

runSpeedScraper()

