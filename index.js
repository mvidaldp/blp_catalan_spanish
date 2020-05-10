// GLOBAL VARs
// requires
const express = require('express')
const bodyParser = require('body-parser')
// const https = require('https')
const fs = require('fs')
const sqlite3 = require('sqlite3').verbose()
const { google } = require('googleapis')
const gd = require('./gd-api.json')
const { GoogleSpreadsheet } = require('google-spreadsheet') // GoogleSpreadsheet
const creds = require('./service-account.json')
const sheetID = '1FDvm7eVe0z9jubFPmdUYLWIGqjNV_7P1w_A-Oo4bn8Y'
const doc = new GoogleSpreadsheet(sheetID)
const db = new sqlite3.Database('sqlite.db') // create and/or open the db

// express webserver
const app = express()
const port = 3000

let insertA = `INSERT INTO answers (
                  \`date\`,`
let insertT = `INSERT INTO times (
                  \`date\`,`
// if err try to add ? before datetime for autoincrement (id)
let insertAend = 'VALUES (datetime("now", "localtime"), '
let insertTend = 'VALUES (datetime("now", "localtime"), '

const inHTML = []
const experiment = []

const languages = ['Català', 'Castellà', 'Altres']
const langCodes = ['ca', 'sp', 'o']

// FUNCTIONS
async function getSpreadSheet () {
  const drive = google.drive({
    version: 'v3',
    auth: gd.key
  })

  const request = await drive.files.get({ fileId: sheetID, fields: 'modifiedTime' })
  const modified = request.data.modifiedTime

  let timestamp
  try {
    if (fs.existsSync('./experiment.lastupdate')) {
      timestamp = fs.readFileSync('./experiment.lastupdate', 'utf8')
    } else {
      fs.createWriteStream('experiment.lastupdate')
      timestamp = undefined
    }
  } catch (err) {
    console.error(err)
  }
  console.log('\nExperiment last update:')
  console.log(`LOCAL  => ${timestamp}`)
  console.log(`ONLINE => ${modified}`)
  if (modified !== timestamp) {
    const file = fs.createWriteStream('experiment.lastupdate')
    file.write(modified)
    await doc.useServiceAccountAuth({
      client_email: creds.client_email,
      private_key: creds.private_key
    })
    await doc.loadInfo()
    // const cols = { cat: 'cathegory', q: 'question', s: 'slider', ans: 'answers', type: 'type'}
    for (let i = 0; i < doc.sheetCount; i++) {
      const sheet = doc.sheetsByIndex[i]
      const sName = sheet.title
      const rows = await sheet.getRows()
      await sheet.loadHeaderRow()
      const headers = sheet.headerValues
      let toWrite = ''
      for (const [ix, row] of rows.entries()) {
        for (const [idx, h] of headers.entries()) {
          let cell = row[h]
          // if cell is not undefined take cell value without line breaks
          if (cell) {
            cell = cell.replace(/(\r\n|\n|\r)/gm, '')
            toWrite += cell
            if (idx < headers.length - 1) toWrite += '\t'
          }
        }
        if (ix < Object.keys(rows).length - 1) toWrite += '\n'
      }
      fs.writeFile(`./${sName}.tsv`, Buffer.from(toWrite, 'utf8'), (err) => {
        if (err) console.log(err)
      })
    }
    readFiles()
  } else readFiles()
}

function parseSurvey (data) {
  const survey = []
  const rows = data.split(/\r\n|\n/) // split by line
  // for all rows read from "questions"
  for (const r of rows) {
    let ans, step, sliders
    const row = r.split('\t')
    const type = row[2].trim() // throws an error "cannot trim undefined" sometimes
    if (row[3].includes('-') && !row[3].includes('/')) ans = row[3].split('-')
    else if (row[3] && row[3].includes('/')) ans = row[3].split('/')
    if (row[4]) step = parseInt(row[4].trim())
    if (row[5]) sliders = parseInt(row[5].trim())
    if (type === 's') ans = ans.map(Number)
    survey.push({
      id: row[0].trim(),
      question: row[1].trim(),
      type: type,
      answers: ans,
      step: step,
      sliders: sliders
    })
  }
  return survey
}

function parseCondition (data) {
  const condition = []
  const rows = data.split(/\r\n|\n/) // split by line
  // for all rows read from "condition"
  for (const r of rows) {
    const row = r.split('\t')
    condition.push({
      id: row[0].trim(),
      question: row[1].trim(),
      type: row[2].trim()
    })
  }
  return condition
}
let nSpr
function readFiles () {
  const quest = fs.readFileSync('./questionnaire.tsv', 'utf8')
  const questions = parseSurvey(quest)
  for (let i = 1; i < 4; i++) {
    const cond = fs.readFileSync(`./condition${i}.tsv`, 'utf8')
    const condition = parseCondition(cond)
    nSpr = condition.length
    experiment.push(condition.concat(questions))
  }
  generateContent()
}
const sprLen = []
function generateContent () {
  for (const e in experiment) {
    inHTML[e] = ''
    for (let i = 0; i < experiment[e].length; i++) {
      let question = experiment[e][i].question
      if (experiment[e][i].type === 'o' && question !== 'Ciutat/estat') {
        let spr = question.replace(/[,.?]/g, (x) => { return `${x}#` })
        spr = spr.split('#')
        spr.pop() // better include a whitespace after the characters on replace
        sprLen.push(spr.length)
        question = ''
        for (const [idx, part] of spr.entries()) {
          question += `<span id="spr${i}_${idx}" class="hidden">${part}</span>`
        }
      }
      let hideC = ' hidden'
      let gridC = 's12'
      let hideB = ''
      const id = experiment[e][i].id
      const type = experiment[e][i].type
      // change style="display: none;" for class="hide"?
      inHTML[e] += `<div id="ques-${i}" class="col s12 content-height" style="display: none;">
                      <h6 id="head-${i}" class="header col s12">
                        ${question}
                      </h6>`
      const extraD = `<div id="group-ans-${i}" class="col s12">
                        <span id=${id}>`
      switch (type) {
        case 'a':
          inHTML[e] += `<div id="ans-${i}"class="row center-align">
                          <div class="input-field col s2 offset-s5">
                            <i class="material-icons prefix">mode_edit</i>
                            <textarea id="${id}" class="materialize-textarea" data-length="2"></textarea>
                          </div>
                        </div>`
          break
        case 'c':
          inHTML[e] += extraD
          for (const ans of experiment[e][i].answers) inHTML[e] += `<a class="btn-large lighten-3">${ans}</a>`
          inHTML[e] += `</span>
                      </div>`
          break
        case 'o':
          hideB = ' hidden'
          if (experiment[e][i].id === 'city') {
            hideC = ''
            gridC = 's4 offset-s4'
            hideB = ''
          }
          inHTML[e] += `<div id="ans-${i}" class="row center-align${hideC}">
                          <div class="input-field col ${gridC}">
                            <i class="material-icons prefix">mode_edit</i>
                            <textarea id="${id}" class="materialize-textarea" data-length="500"></textarea>
                          </div>
                        </div>`
          break
        case 's':
          inHTML[e] += extraD
          for (let s = 0; s < experiment[e][i].sliders; s++) {
            const min = experiment[e][i].answers[0]
            const max = experiment[e][i].answers[1]
            inHTML[e] += `<div class="valign-wrapper">
                            <div class="col s12">
                              <span>${languages[s]}</span>
                            </div>
                          </div>
                          <div class="valign-wrapper">
                            <div class="col s1 valign-wrapper">
                              <a class="btn-floating">${min}</a>
                            </div>
                            <form class="col s10" action="#">
                              <div class="valign-wrapper">
                                <p class="range-field col s12">
                                  <input id="${id}_${langCodes[s]}" step="${experiment[e][i].step}" autocomplete="off"
                                   type="range" min="${min}" max="${max}" value="${parseInt(max / 2)}">
                                </p>
                              </div>
                            </form>
                            <div class="col s1 valign-wrapper flex-row-reverse">
                              <a class="btn-floating">${max}</a>
                            </div>
                          </div>`
          }
          inHTML[e] += `</span>
                      </div>`
          break
        default:
        // recommended block
      }
      if (type !== 'c') {
        inHTML[e] += `<div class="col s12">
                        <input type="hidden" id="hidden-${i}" value="${id}">
                        <button id="submit-${i}" class="btn-large lighten-3 center${hideB}">
                          <i class="large material-icons">send</i>
                        </button>
                      </div>`
      }
      inHTML[e] += '</div>'
    }
    createTables()
  }
  console.log(sprLen)
}

function createTables () {
  let createA = `CREATE TABLE IF NOT EXISTS answers (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 date TEXT,
                 condition INTEGER,`
  let createT = `CREATE TABLE IF NOT EXISTS times (
                 id INTEGER PRIMARY KEY AUTOINCREMENT,
                 date TEXT,
                 condition INTEGER,`

  // prepare create and insert answers and time queries
  for (let i = 0; i < experiment[0].length; i++) {
    let type
    switch (experiment[0][i].type) {
      case 'a':
      case 's':
        type = 'INTEGER'
        break
      case 'c':
      case 'o':
        type = 'TEXT'
        break
      default:
      // code block
    }
    const id = experiment[0][i].id
    if (experiment[0][i].type !== 's') createA += `\n${id} ${type},`
    else {
      for (let s = 0; s < experiment[0][i].sliders; s++) createA += `\n${id}_${langCodes[s]} ${type},`
    }
  }
  for (let i = 0; i < nSpr; i++) {
    for (let j = 0; j < sprLen[i]; j++) createT += `\nspr${i}_${j} INTEGER,`
    createT += `\nspr${i}_ans INTEGER,`
  }

  createA = `${createA.substring(0, createA.length - 1)});`
  createT = `${createT.substring(0, createT.length - 1)});`

  // create answers and times tables (if none)
  db.run(createA)
  db.run(createT)
}

function serverRouting () {
  app.get('/', (req, res) => {
    const nConditions = experiment.length
    // pick a condition randomly
    const condition = Math.floor(Math.random() * nConditions)
    const nQuestions = experiment[condition].length
    console.log(`Condition: ${condition + 1}`)
    res.render('index', {
      content: inHTML[condition],
      nQuestions: nQuestions,
      condition: condition + 1
    })
  })

  app.post('/save', (req) => {
    const answers = JSON.parse(req.body.answers)
    const times = JSON.parse(req.body.times)
    // TODO: look for a cleaner/nicer way to get this vars
    console.log('\nExperiment completed:')
    console.log(answers)
    console.log(times)

    const aKeys = Object.keys(answers)
    const aValues = Object.values(answers)
    const tKeys = Object.keys(times)
    const tValues = Object.values(times)

    for (const k of aKeys) {
      insertA += `\n${k},`
      insertAend += '?, '
    }
    for (const k of tKeys) {
      insertT += `\n${k},`
      insertTend += '?, '
    }

    insertA = `${insertA.substring(0, insertA.length - 1)})\n${insertAend}`
    insertA = `${insertA.substring(0, insertA.length - 2)});`
    insertT = `${insertT.substring(0, insertT.length - 1)})\n${insertTend}`
    insertT = `${insertT.substring(0, insertT.length - 2)});`

    db.serialize(() => {
      db.run(insertA, aValues)
      db.run(insertT, tValues)
    })
  })
}

// CALLS
// express options
app.use(express.static('static')) // use static folder
app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())
app.set('view engine', 'ejs')
app.listen(port, () => console.log(`Server running on port ${port}...`))

// survey processing, database handling and server routing
// start survey generation process
getSpreadSheet()
serverRouting() // express server routing (GET and POST requests responses)
