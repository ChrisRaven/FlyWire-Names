// ==UserScript==
// @name         Names
// @namespace    KrzysztofKruk-FlyWire
// @version      0.1
// @description  Allows adding local names to segments
// @author       Krzysztof Kruk
// @match        https://ngl.flywire.ai/*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ChrisRaven/FlyWire-Names/main/Names.user.js
// @downloadURL  https://raw.githubusercontent.com/ChrisRaven/FlyWire-Names/main/Names.user.js
// @homepageURL  https://github.com/ChrisRaven/FlyWire-Names
// ==/UserScript==

if (!document.getElementById('dock-script')) {
  let script = document.createElement('script')
  script.id = 'dock-script'
  script.src = typeof DEV !== 'undefined' ? 'http://127.0.0.1:5501/FlyWire-Dock/Dock.js' : 'https://chrisraven.github.io/FlyWire-Dock/Dock.js'
  document.head.appendChild(script)
}

let wait = setInterval(() => {
  if (globalThis.dockIsReady) {
    clearInterval(wait)
    main()
  }
}, 100)


function main() {
  initNames()

  document.addEventListener('fetch', result => {
    if (!result.detail.url.includes('/root?')) return

  })

  document.addEventListener('contextmenu', e => changeName(e))
}


let names = {}


function saveToLS() {
  Dock.ls.set('names-history', names, true)
}


function getFromLS() {
  names = Dock.ls.get('names-history', true)
  if (!names) {
    names = {}
  }
}


function initNames() {
  getFromLS()

  let buttons = document.getElementsByClassName('segment-button')
  buttons.forEach(button => {
    const name = names[button.dataset.segId]
    if (name) {
      button.textContent = name
    }
  })
}


function changeName(e) {
  if (!e.ctrlKey) return

  const el = e.target
  const name = el.textContent
  Dock.dialog({
    id: 'kk-utilities-edit-segment-name',
    html: '<input id="kk-utilities-new-segment-name" value="' + name + '">',
    okCallback: okCallback,
    okLabel: 'Save',
    destroyAfterClosing: true
  }).show()

  function okCallback() {
    const newName = document.getElementById('kk-utilities-new-segment-name').value
    const id = el.dataset.segId
    el.textContent = newName
    names[id] = newName
    saveToLS()
  }
}
