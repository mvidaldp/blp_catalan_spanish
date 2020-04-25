// IMPORTANT!! -> Change 'click' for 'touchend' to make it work on touchscreens
const nQuestions = parseInt($('#nquest').text())
let currentQ
const times = {}
let answers = {}
let percentage = currentQ / nQuestions * 100

/**
 * Shuffle the elements of a given array, return the shuffled array.
 * @param {Array} arr - Given array
 * @return {Array} - Shuffled array
 */
// function shuffleArray (arr) { // NOT USED, KEPT for DESCRIPTION
//   for (let i = arr.length - 1; i > 0; i--) {
//     let j = Math.floor(Math.random() * (i + 1))
//     let x = arr[i]
//     arr[i] = arr[j]
//     arr[j] = x
//   }
//   return arr
// }

function initializeSurvey () {
  currentQ = 0
  answers = {}
  // NOT WORKING, CHECK
  // for (let i = 0; i < nQuestions; i++) {
  //   if ($(`#ans-${i}`).length) {
  //     let child = 0
  //     if ($(`#ans-${i}`).children().length > 1) child = 1
  //     const defaultVal = $(`ans-${i}`).children()[child].prop('defaultValue')
  //     $(`ans-${i}`).children()[child].value = defaultVal
  //   }
  // }
  updateProgressBar()
  $('#progressbar').parent().css('visibility', 'hidden')
  $('#thanks').css('display', 'none')
  setClickEventListeners()
}

function setClickEventListeners () {
  for (let i = 0; i < nQuestions; i++) {
    $(`#slider-${i}`).off('click')
    $(`#slider-${i}`).on('click', getSelected)
    $(`#group-ans-${i} > a`).off('click')
    $(`#group-ans-${i} > a`).on('click', getSelected)
    $(`#ans-${i}-submit`).off('click')
    let child = 0
    if ($(`#ans-${i}`).children().length > 1) child = 1
    $(`#ans-${i}-submit`).on('click', () => {
      if ($(`#ans-${i}`).children()[child].value !== '') {
        $(`#ans-${i}-submit`).off('click')
        getSelected()
      }
    })
    if ($(`#ans-${i}`).children()[child]) $(`#ans-${i}`).children()[child].value = ''
  }
  $('#start').on('click', () => {
    startSurvey()
  })
}

function startSurvey () {
  $('#instructions').css('display', 'none')
  $('#survey').css('display', '')
  $('#progressbar').parent().css('visibility', '')
  $(`#ques-${currentQ}`).fadeToggle('slow')
  $('#logos').css('visibility', 'hidden')
}

function getSelected () {
  let child = 0
  if ($(`#ans-${currentQ}`).children().length > 1) child = 1
  $(`#slider-${currentQ}`).off('click')
  $(`#group-ans-${currentQ} > a`).off('click')
  let selected = $(`#ans-${currentQ}`).children()[child].value
  let id = $(`#ans-${currentQ}`).children()[child].id
  if (selected !== undefined) answers[id] = selected
  else {
    selected = $(this).children()[child].innerHTML
    id = $(this).children()[child].id
    answers[id] = selected
  }
  $(`#ques-${currentQ}`).fadeToggle('slow').promise().done(() => {
    nextQuestion()
    $(`#ques-${currentQ}`).fadeToggle('slow').promise().done(() => {
      if (currentQ === nQuestions) {
        submitAnswers()
      }
    })
  })
}

function nextQuestion () {
  currentQ++
  updateProgressBar()
}

function updateProgressBar () {
  percentage = currentQ / nQuestions * 100
  $('#progressbar').css('width', percentage + '%')
}

function submitAnswers () {
  const responses = JSON.stringify(answers)
  $.post('/save', {
    answers: responses
  })
  // TODO: add/remove class hidden for visibility: hidden; enable/disable
  $('#logos').css('visibility', '')
  $('#progressbar').parent().css('visibility', 'hidden')
  $('#thanks').fadeToggle('slow')
}

$(document).on('contextmenu', () => {
  return false // disable context menu
})

let current
let sprPos
let initialT
let date
let ageN
$(document).ready(() => {
  for (let i = 0; i < nQuestions; i++) {
    const found = $(`#ans-${i}`).children('input[type="number"]')
    if (found.length > 0) ageN = i
  }
  initializeSurvey()
  $(document).on('keypress', (e) => { // ask Moni if better keydown/keypress/keyup
    if (e.keyCode === 32 && $(`#head-${currentQ}`).children().length > 0) {
      if (current !== currentQ) {
        current = currentQ
        sprPos = 0
        date = new Date()
        initialT = date.getTime()
      }
      else {
        // console.log($(`#spr${currentQ}_${sprPos}`))
        if ($(`#spr${currentQ}_${sprPos}`).length) {
          date = new Date()
          const elapsedT = date.getTime() - initialT
          initialT = date.getTime()
          alert(elapsedT)
          times[`spr${currentQ}_${sprPos}`] = elapsedT
          sprPos++
        }
      }
      $(`#spr${currentQ}_${sprPos}`).removeClass('hidden')
    }
    // TODO: also fix getting age question number (for storing it as integer I guess)
  })
})
