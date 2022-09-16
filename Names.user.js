// ==UserScript==
// @name         Organizer
// @namespace    KrzysztofKruk-FlyWire
// @version      1.0
// @description  Allows adding local names to segments and creating local groups
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
console.log('organizer')
let wait = setInterval(() => {
  if (globalThis.dockIsReady) {
    clearInterval(wait)
    main()
  }
}, 100)


let storage
let names = {}
let groups = {}

let lastTwoRootsRemoved = []
let lastTwoRootsAdded = []


function main() {
  storage = window.Sifrr.Storage.getStorage('indexeddb')
  storage.set('kk-groups', {value: [{title: 'group1', children: ['720575940618736542', '720575940617007965']}, {title: 'other group', children: ['720575940610373496', '720575940625870142', '720575940628144113']}, {title: 'empty group', children: []}]}) // TEMP
  
  let dock = new Dock()

  dock.addAddon({
    css: generateCss()
  })

  const graphLayer = Dock.layers.getByType('segmentation_with_graph', false)[0]
  if (graphLayer) {
    const displayState = graphLayer.layer.displayState
    displayState.rootSegments.changed.add((rootId, added) => {
      if (added) {
        if (Array.isArray(rootId) && rootId.length) {
          rootId.forEach(id => {
            lastTwoRootsAdded.push(id.toString())
          })
        }
        else {
          rootId && lastTwoRootsAdded.push(rootId.toString())
        }

        while (lastTwoRootsAdded.length > 2) {
          lastTwoRootsAdded.shift()
        }
        initNames()
      }
      else {
        if (lastTwoRootsRemoved.length === 2) {
          lastTwoRootsRemoved.shift()
        }
        // TODO: Cannot read properties of null (reading 'toString') (when clearing list)
        rootId && lastTwoRootsRemoved.push(rootId.toString())
      }
    })

    Dock.addToRightTab('segmentation_with_graph', 'Rendering', initNames)
  }

  document.addEventListener('fetch', e => {
    const response = e.detail.response
    const url = e.detail.url
    const params = e.detail.params
// TODO: Uncaught TypeError: Cannot read properties of undefined (reading '0') (prawdopdobnie w innych miejscach również)
    if (!url.includes('split?') && !url.includes('merge?')) return

    const newRootId1 = response.new_root_ids[0]
    const newRootId2 = response.new_root_ids[1]
    
    if (url.includes('split?')) {
      let index = lastTwoRootsRemoved.length - 1
      const potentialName = names[lastTwoRootsRemoved[index]]
      if (!potentialName) return

      delete names[lastTwoRootsRemoved[index]]
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
          if (potentialName1 === potentialName2) {
            newName = potentialName1
          }
          else {
            newName = potentialName1 + '+' + potentialName2
          }
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


function saveToLS(callback, what = 'all') {
  const namesPromise = storage.set('kk-names-history', { value: names })
  const groupsPromise = storage.set('kk-groups', { value: groups })

  function setNames() {
    namesPromise.then(() => {
      if (what === 'all') return

      callback && callback()
    })
  }

  function setGroups() {
    groupsPromise.then(() => {
      if (what === 'all') return

      callback && callback()
    })
  }
  
  const both = Promise.all([namesPromise, groupsPromise])

  switch (what) {
    case 'names': setNames(); break
    case 'groups': setGroups(); break
    case 'all': setNames(); setGroups(); both.then(callback && callback); break
    default: setNames(); setGroups(); both.then(callback && callback); break
  }
}


function getFromLS(callback, what = 'all') {
  const namesPromise = storage.get('kk-names-history')
  const groupsPromise = storage.get('kk-groups')
  function getNames() {
    namesPromise.then(values => {
      names = values ? values['kk-names-history'] : {}
      if (!names) {
        names = {}
      }
      if (what === 'all') return

      callback && callback()
    })
  }

  function getGroups() {
    groupsPromise.then(values => {
      groups = values ? values['kk-groups'] : {}
      if (!groups) {
        groups = {}
      }
      if (what === 'all') return

      callback && callback()
    })
  }

    
  const both = Promise.all([namesPromise, groupsPromise])

  switch (what) {
    case 'names': getNames(); break
    case 'groups': getGroups(); break
    case 'all': getNames(); getGroups(); both.then(callback && callback); break
    default: getNames(); getGroups(); both.then(callback && callback); break
  }
}


function initNames() {
  getFromLS(() => {
    const graphLayerTabs = Dock.layers.getByType('segmentation_with_graph', false)[0].layer.tabs
    if (graphLayerTabs.value !== 'rendering') {
      waitingForTabChange = true
      return
    }
    
    createGroups()
    fillButtons()
  })
}


function addNewGroupButton() {
  const button = document.createElement('button')
  button.textContent = 'New Group'
  const addSegmentField = document.getElementsByClassName('add-segment')[0]
  if (!addSegmentField) return

  addSegmentField.parentNode.appendChild(button)
  button.addEventListener('click', () => {
    Dock.dialog({
      id: 'kk-organizer-new-group-name-dialog',
      html: 'New group\'s name: <input id="kk-organizer-new-group-name">',
      okCallback: createNewGroup,
      destroyAfterClosing: true,
      okLabel: 'Create',
      cancelCallback: () => {}
    }).show()
  })

  function createNewGroup() {
    const input = document.getElementById('kk-organizer-new-group-name')
    const name = input.value
    if (!name) return


    groups.push({title: name, children: []})
    
    saveToLS(null, 'groups')
    createGroup(name)
  }
}


function addEmptyGroupContent(parent) {
  const empty = document.createElement('div')
  empty.classList.add('kk-organizer-empty')
  empty.textContent = '(empty)'
  parent.appendChild(empty)
}


function createGroup(name, children, idToNode) {
  const wrapper = document.createElement('div')
  const title = document.createElement('div')

  wrapper.classList.add('kk-organizer-group')
  title.textContent = name
  wrapper.appendChild(title)

  if (children && children.length) {
    children.forEach(child => {
      const node = idToNode[child]
      if (!node) return

      wrapper.appendChild(node)
    })
  }
  else {
    addEmptyGroupContent(wrapper)
  }

  const container = document.getElementsByClassName('item-container')[0]
  if (!container) return

  let prev = container.firstChild.nextSibling
  if (document.getElementById('kk-utilities-action-menu')) {
    prev = prev.nextSibling
  }

  addChangeGroupNameButton(wrapper)
  addDeleteGroupButton(wrapper)
  // TODO: add button "Change color of all segments"
  container.insertBefore(wrapper, prev)
}


function addChangeGroupNameButton(wrapper) {
  const button = document.createElement('button')
  button.textContent = 'Rename'
  button.addEventListener('click', e => changeGroupNameHandler)
  wrapper.appendChild(button)
}


function addDeleteGroupButton(wrapper) {
  const button = document.createElement('button')
  button.textContent = 'Delete'
  button.addEventListener('click', e => deleteGroupHandler)
  wrapper.appendChild(button)
}


function changeGroupNameHandler(e) {
  const group = e.target.parentNode
  Dock.dialog({
    id: 'kk-organizer-change-group-name',
    html: 'New name: <input id="kk-organizer-change-group-name-input">',
    okCallback: saveChange,
    okLabel: 'Save',
    cancelCallback: () => {},
    destroyAfterClosing: true
  }).show()

  function saveChange() {
    const newName = document.getElementById('kk-organizer-change-group-name-input').value
    if (!newName) return

    // TODO: update name in HTML
    // TODO: update name in "groups"
    // TODO: save changes to "kk-groups"
  }
}


function deleteGroupHandler(e) {
  const group = e.target.parentNode

  Dock.dialog({
    id: 'kk-organizer-delete-group',
    html: 'Do you really want to delete this group? (all the segments will be moved to the end of the segments\' list)',
    okCallback: deleteGroup,
    okLabel: 'Delete',
    cancelCallback: () => {},
    destroyAfterClosing: true
  }).show()

  function deleteGroup() {
    // TODO: move segments to the end
    // TODO: remove group from HTML
    // TODO: remove group from "groups"
    // TODO: save changes to "kk-groups"
  }
}

// TODO: make all the groups' names unique (also in the iDB and in HTML)
// TODO: create button to move all selected segments to selected group
function createGroups() {
  addNewGroupButton()

  if (!groups || !Object.keys(groups)) return

  const segments = document.getElementsByClassName('segment-button')
  const idToNode = {}
  for (const seg of segments) {
    idToNode[seg.dataset.segId] = seg.parentNode
  }

  if (document.getElementsByClassName('kk-organizer-group').length) return

  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i]
    createGroup(group.title, group.children, idToNode)
  }
}


function fillButtons() {
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
  if (!el.classList.contains('segment-button')) return

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


function generateCss() {
  return /*css*/`
    .kk-organizer-group {
      width: 100%;
    }

    .kk-organizer-empty {
      font-style: italic;
      color: gray;
      padding: 5px;
    }
  `
}