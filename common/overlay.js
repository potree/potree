"use strict"

import { theme, isLocalDevelopment} from "../demo/paramLoader.js"

let numberTasks = 10; // default to 10 (should be set in loaderHelper.js)
let completedTasks = 0;

// NOTE: using https://loadingbar.io/progress
// pass around the same loading bar element rather than creating new ones
const loadingBarTotal = createLoadingBar("loading-bar-total"); // Tracks total progress
const loadingBar = createLoadingBar("loading-bar"); // Tracks individual progress

function createLoadingBar(id) {
  const loadingBarColor = theme ? theme.palette.secondary.main : "#edac3e";

  // https://loading.io/progress/#reference
  // data-stroke-width & data-stroke-width determines the height of the bar
  // style width determines how long the bar is
  const options = {
    "data-stroke":                  loadingBarColor,
    "data-stroke-trail-background": loadingBarColor,
    "data-preset":                  "line",
    "data-value":                   "0",
    "data-stroke-width":            "5",
    "data-stroke-trail-width":      "5",
  }
  const styles = {
    width:                      "30%",
    height:                     "10%",
    margin:                     "1%",
    display:                    "inline-block",
    color:                      "#FFFFFF", // white
  }

  // actually update info
  $(`#${id}`).attr(options)
  $(`#${id}`).css(styles)
  return new ldBar(`#${id}`, options)
}

export function setNumTasks(newVal) {
  numberTasks = newVal
}

export function getNumTasks() {
  return numberTasks
}

/**
 * @brief Helper function that reset the necessary variables to all the progress bars to be valid after initial load
 * @note Expected use: loading buttons (Load Gaps, Load Radar, Load Detections, etc)
 * @param {Number} numTasks (optional) The number of tasks that need to be completed
 * - default = 2 for downloading + loading
 */
export function resetProgressBars(numTasks=2) {
  completedTasks = 0
  setNumTasks(numTasks)
  setLoadingScreen()
}

/*
 * Function that hands back control of the thread to the window such that it can update the progress bar.
 * Without using it whenever setting the loading bar, the javascript code will run and block the UI that
 * needs to update the loading bar
 * CURRENTLY: even though everything should be
*/
export async function pause(name) {
  // argument for debugging if user wants to log what is currently trying to set the progress bar
  if (name) { console.log("pause " + name);}
  return new Promise(resolve => setTimeout(() => {resolve()}, 0));
}

export function setLoadingScreen() {
  // set style of loading screen
  $("#loading-bar-total")[0].style.display = "inline-block";
  $("#loading-bar")[0].style.display = "inline-block";
  document.getElementById("loading_overlay").style.display = "flex";

  // set starting position of loading bars
  loadingBar.set(0);
  loadingBarTotal.set(0);
  window.loadingScreenUp = true;
}

export function removeLoadingScreen() {
  window.loadingScreenUp = false;
  document.getElementById("loading_overlay").style.display = "none";
  clearInterval(maintainProgressBar)
}

/**
 * @brief Helper function that updates the loading bars relative to the `numberTasks` after completion of a major task
 * @param {String} text (optional) If localhost (i.e. a dev), print `completedTasks/numberTasks: ${text}`
 */
export async function incrementLoadingBarTotal(text) {
  completedTasks++
  const currentProg = completedTasks/numberTasks*100
  const toSet = calcToSet(currentProg, loadingBarTotal)
  loadingBarTotal.set(toSet);
  loadingBar.set(0);
  // for debugging print the name & number for each load/download event
  // only happens for localhost users (i.e. devs)
  if (text && isLocalDevelopment) {
    console.log(`${completedTasks}/${numberTasks}: ${text}`)
  }
  if (completedTasks == numberTasks || loadingBarTotal.value >= 100) {
    removeLoadingScreen();
  }
  await pause();
}

/**
 * @brief Helper function which handles all the weird Math stuff to keep the loading bar consistent
 * @param {Number} currPerc The current percentage of completion of the task
 * (additional math to clean up the number and make progress bar clean done here)
 */
export async function updateLoadingBar(currPerc) {
  if (Math.ceil(currPerc) > Math.ceil(loadingBar.value) || Math.ceil(currPerc) >= 100) {
    const toSet = calcToSet(currPerc, loadingBar)
    loadingBar.set(toSet)
    await pause()
  }
}

function calcToSet(currPercent, thisLoadingBar) {
  const intPerc = Math.ceil(currPercent)
  const currVal = thisLoadingBar.value
  const newProg = Math.max(intPerc, currVal)
  const toSet = Math.min(newProg, 100)
  return toSet
}

// hack to get the progress bar to not revert backwards mid-load
// not an issue with 'loadingBar' because its value is contantly updated
// stopped on 'removeLoadingScreen()'
const maintainProgressBar = window.setInterval(() => {
  const roundedPerc = Math.ceil(completedTasks/numberTasks*100, true)
  loadingBarTotal.set(roundedPerc)
}, 1000)
