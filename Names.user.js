// ==UserScript==
// @name         Names
// @namespace    KrzysztofKruk-FlyWire
// @version      0.1.1
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


let storage
let names = {}

let lastTwoRootsRemoved = []
let lastTwoRootsAdded = []


function main() {
  storage = window.Sifrr.Storage.getStorage('indexeddb')
  
  initNames()
  const graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0]
  if (graphLayer) {
    const displayState = graphLayer.layer.displayState
    displayState.rootSegments.changed.add((rootId, added) => {
      if (added) {
        if (Array.isArray(rootId)) {
          rootId.forEach(id => {
            lastTwoRootsAdded.push(id.toString())
          })
        }
        else {
          lastTwoRootsAdded.push(rootId.toString())
        }

        while (lastTwoRootsAdded.length > 2) {
          lastTwoRootsAdded.shift()
        }

      }
      else {
        if (lastTwoRootsRemoved.length === 2) {
          lastTwoRootsRemoved.shift()
        }
        lastTwoRootsRemoved.push(rootId.toString())
      }
    })
  }

  document.addEventListener('fetch', e => {
    const response = e.detail.response
    const url = e.detail.url
    const params = e.detail.params

    if (!url.includes('split?') && !url.includes('merge?')) return

    const newRootId1 = response.new_root_ids[0]
    const newRootId2 = response.new_root_ids[1]
    
    if (url.includes('split?')) {
      const potentialName = names[lastTwoRootsRemoved[1]]
      if (!potentialName) return

      delete names[lastTwoRootsRemoved[1]]
      names[newRootId1] = potentialName
      names[newRootId2] = potentialName
      saveToLS(initNames)
    }
    else if (url.includes('merge?')) {
      const potentialName1 = names[lastTwoRootsRemoved[0]]
      const potentialName2 = names[lastTwoRootsRemoved[1]]
      const newRootId = response.new_root_ids[0]
      let newName

      if (!potentialName1 && !potentialName2) return
    
        if (potentialName1 && potentialName2) {
          newName = potentialName1 + '+' + potentialName2
        }
        else {
          newName = potentialName1 || potentialName2
        }

        delete names[lastTwoRootsRemoved[0]]
        delete names[lastTwoRootsRemoved[1]]
        names[newRootId] = newName
        saveToLS(initNames)
    }
  })

  document.addEventListener('contextmenu', e => changeName(e))
}


function saveToLS(callback) {
  storage.set('kk-names-history', { value: names }).then(() => callback && callback())
}


function getFromLS(callback) {
  storage.get('kk-names-history').then(values => {
    names = values ? values['kk-names-history'] : {}
    if (!names) {
      names = {}
    }
    callback && callback()
  })
}


function initNames() {
  getFromLS(() => {
    let buttons = document.getElementsByClassName('segment-button')
    buttons.forEach(button => {
      const name = names[button.dataset.segId]
      if (name) {
        button.textContent = name
      }
    })
  })
}


function changeName(e) {
  if (!e.ctrlKey) return

  const el = e.target
  if (!el.target.classList.contains('segment-button')) return

  const name = el.textContent
  Dock.dialog({
    id: 'kk-utilities-edit-segment-name',
    html: '<input id="kk-utilities-new-segment-name" value="' + name + '">',
    okCallback: okCallback,
    okLabel: 'Save',
    destroyAfterClosing: true
  }).show()

  function okCallback() {
    let newName = document.getElementById('kk-utilities-new-segment-name').value
    const id = el.dataset.segId

    if (!newName) {
      newName = id
      delete names[id]
    }
    else {
      names[id] = newName
    }
    
    el.textContent = newName
    saveToLS()
  }
}
