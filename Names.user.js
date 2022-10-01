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

let root
let displayState


function main() {
  storage = window.Sifrr.Storage.getStorage('indexeddb')
  storage.set('kk-organizer', {
    value: {
      id: '1',
      name: 'root',
      children: {
        groups: {
          '4x': {
            name: 'group1',
            id: '4x',
            color: '#00FF00',
            expanded: true,
            isSelected: false,
            children: {
              groups: {},
              segments: {
                '720575940618736542': {
                  id: '720575940618736542',
                  name: 'abc',
                  isSelected: false
                },
                '720575940617007965': {
                  id: '720575940617007965',
                  name: 'Cd',
                  isSelected: true
                }
              }
            }
          },
          '2x': {
            name: 'other group',
            id: '2x',
            children: {
              groups: {
                '5x': {
                  name: 'subgroup',
                  id: '5x',
                  children: {
                    groups: {},
                    segments: {}
                  },
                  color: '#FFFFFF',
                  expanded: true,
                  isSelected: false
                },
                '6a': {
                  name: 'subgroup',
                  id: '6a',
                  children: {
                    groups: {},
                    segments: {
                      '720575940610373497': {
                        id: '720575940610373497',
                        name: 'probably outdated',
                        isSelected: false
                      }
                    }
                  },
                  color: '#FFFFFF',
                  expanded: true,
                  isSelected: false
                }
              },
              segments: {
                '720575940610373496': {
                  id: '720575940610373496',
                  name: '',
                  isSelected: false
                },
                '720575940625870142': {
                  id: '720575940625870142',
                  name: '',
                  isSelected: true
                },
                '720575940628144113': {
                  id: '720575940628144113',
                  name: 'longer name',
                  isSelected: false
                }
              }
            },
            color: '#FFFF00',
            expanded: false,
            isSelected: false
          },
          '3x': {
            name: 'empty group',
            id: '3x',
            children: {
              groups: {},
              segments: {}
            },
            color: '#FFFFFF',
            expanded: true,
            isSelected: false
          }
        },
        segments: {
          '720575940610373498': {
            id: '720575940610373498',
            name: '',
            isSelected: false
          },
          '720575940625870143': {
            id: '720575940625870143',
            name: '',
            isSelected: true
          },
          '720575940628144114': {
            id: '720575940628144114',
            name: 'longer name',
            isSelected: false
          }
        }
      }
    }
  }) // TEMP

  displayState = Dock.layers.getByType('segmentation_with_graph', false)[0].layer.displayState

  const dock = new Dock()
  dock.addAddon({
    css: generateCss()
  })
  storage.get('kk-organizer').then(res => {
    const tree = res['kk-organizer']
    root = new Group('root', null, 1, false)

    generateTree(tree, root, () => {
      // if there are still segments, that don't belong anywhere, add them as children of the root
      // .querySelectorAll() because it's the only method, that returns a static Nodelist
      document.querySelectorAll('.item-container > .segment-div').forEach(el => {
        if (!el.dataset.id) {
          el = el.getElementsByClassName('segment-button')[0]
          root.addSegment('', el.dataset.segId)
        }
      })
    })

    

  
    // root.node.addEventListener('click', e => {
    //   if (e.target.classList.contains('kk-organizer-group-title')) {
    //     eventHandlers.toggleGroup(e)
    //   }
    // })
  }) 

  function generateTree(parent, parentObj, callback) {
    for (const group of Object.values(parent.children.groups)) {
      const g = parentObj.addGroup(group.name, group.id, false)
      if (Object.keys(group.children.groups).length) {
        generateTree(group, g)
      }
    }

    for (const segment of Object.values(parent.children.segments)) {
      const s = parentObj.addSegment(segment.name, segment.id, false)
    }

    callback && callback()
  }
  


  const eventHandlers = {
    toggleGroup: e => {
      // TODO: handle expanding/collapsing
    },
  }
  

    // Dock.addToRightTab('segmentation_with_graph', 'Rendering', initTree)
  // }

  // TEMP
  document.getElementsByClassName('neuroglancer-viewer-top-row')[0].addEventListener('click', e => {
    console.log(root)
  })
  document.addEventListener('fetch', e => {return // TEMP
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
      saveToiDB(initNames)
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
        saveToiDB(initNames)
    }
  })

  // document.addEventListener('contextmenu', e => changeName(e))
}

function saveToiDB() {
  storage.set('kk-organizer', { value: root.toJSON() })
}


class Group {
  children = {
    groups: [],
    segments: []
  }
  parent = null
  isSelected = false
  name = ''
  id = -1
  node = null
  navbar = null
  type = 'group'

  constructor (name, parent, id, save = true) {
    if (!id) {
      id = Dock.getRandomAlphaString()
    }

    if (!name) {
      throw new Error('Name is required!')
    }

    this.id = id
    this.name = name
    this.parent = parent

    // TODO: change the below to separate functions adding each button
    if (id === 1) { // root
      this.node = document.getElementsByClassName('item-container')[0]
      this.node.id = 'kk-organizer-root'
      this.node.dataset.id = 1
      this.node.dataset.name = 'root'
      this.node.classList.add('kk-organizer-root')
    }
    else {
      const groupNode = document.createElement('div')
      groupNode.id = id
      groupNode.dataset.id = id
      groupNode.dataset.name = name
      groupNode.classList.add('kk-organizer-group')
      this.node = groupNode
    }

    const navBarNode = document.createElement('div')
    navBarNode.classList.add('kk-organizer-group-navbar')

    const titleNode = document.createElement('div')
    titleNode.classList.add('kk-organizer-group-navbar-title')
    titleNode.textContent = id === 1 ? '' : this.name
    navBarNode.appendChild(titleNode)

    const addGroupNode = document.createElement('div')
    addGroupNode.classList.add('kk-organizer-group-navbar-addgroup')
    addGroupNode.textContent = 'G'
    addGroupNode.title = 'Add new group'
    addGroupNode.addEventListener('click', e => {
      this.interactiveAddGroup(this)
    })
    navBarNode.appendChild(addGroupNode)

    const addSegmentsNode = document.createElement('div')
    addSegmentsNode.classList.add('kk-organizer-group-navbar-addsegments')
    addSegmentsNode.textContent = 'S'
    addSegmentsNode.title = 'Add segments'
    addSegmentsNode.addEventListener('click', e => {
      this.interactiveAddSegments(this)
    })
    navBarNode.appendChild(addSegmentsNode)

    const deleteNode = document.createElement('div')
    deleteNode.classList.add('kk-organizer-group-navbar-delete')
    deleteNode.textContent = 'D'
    deleteNode.title = 'Delete'
    deleteNode.addEventListener('click', e => {
      this.interactiveDelete(this)
    })
    navBarNode.appendChild(deleteNode)

    this.navBar = { node: navBarNode }
    this.navBar.title = { node: titleNode }
    this.navBar.newGroup = { node: addGroupNode }
    this.navBar.addSegments = { node: navBarNode }
    this.navBar.delete = { node: deleteNode }

    if (this.id === 1) {
      const saveToFileNode = document.createElement('div')
      saveToFileNode.textContent = 'Sv'
      saveToFileNode.title = 'Save to File'
      saveToFileNode.addEventListener('click', e => {
        this.saveToFile()
      })
      navBarNode.appendChild(saveToFileNode)

      const openFromFileNode = document.createElement('input')
      openFromFileNode.type = 'file'
      openFromFileNode.title = 'Open from File'
      openFromFileNode.addEventListener('change', e => {
        this.readFromFile(e.target)
        e.target.value = null
      })
      navBarNode.appendChild(openFromFileNode)
    }
    
    this.node.appendChild(navBarNode)

    if (save) {
      saveToiDB()
    }
  }

  interactiveAddGroup(parent, callback) {
    Dock.dialog({
      id: 'kk-organizer-create-new-group-dialog',
      html: 'Type the name of the group <input id="kk-organizer-create-new-group-input">',
      okCallback: () => {
        const newName = document.getElementById('kk-organizer-create-new-group-input').value
        if (!newName) {
          throw new Error('Name cannot be empty')
        }

        const group = new Group(newName, parent)
        callback && callback(group)
        parent.children.groups[group.id] = group
        parent.node.appendChild(group.node)
      },
      okLabel: 'create',
      cancelCallback: () => {},
      destroyAfterClosing: true
    }).show()
  }

  interactiveAddSegments(parent, callback) {
    const okCallback = () => {
      let newSegments = document.getElementById('kk-organizer-add-segments-input').value
      if (!newSegments) return

      newSegments = newSegments.split(/[\s,]+/)

      let counter = newSegments.length
      if (!counter) return

      function count() {
        if (!counter--) {
          callback && callback()
        }
      }

      newSegments.forEach(id => {
        let seg = this.getNodeById(id)
        if (seg) {
          Helpers.move(seg, parent)
          count()
        }
        else {
          seg = new Segment(this, id, '', true, seg => {
            parent.children.segments[id] = seg
            parent.node.appendChild(seg.node)
            count()
          })
        }
      })
    }

    Dock.dialog({
      id: 'kk-organizer-add-segments-dialog',
      html: 'Type segments\' IDs (separated by commas or spaces) <input id="kk-organizer-add-segments-input">',
      okCallback: okCallback,
      okLabel: 'Add',
      cancelCallback: () => {},
      destroyAfterClosing: true
    }).show()
  }

  interactiveDelete() {
    const okCallback = () => {
      this.delete()
    }

    Dock.dialog({
      id: 'kk-organizer-delete-dialog',
      html: 'Are you sure, you want to delete this group?',
      okCallback: okCallback,
      okLabel: 'Delete',
      cancelCallback: () => {},
      destroyAfterClosing: true
    }).show()
  }

  getNodeById(id) {
    const segmentPatch = document.querySelector(`[data-seg-id="${id}"]`)
    if (!segmentPatch) return null

    return segmentPatch.parentNode
  }

  addGroup(name, id, save = true) {
    const group = new Group(name, this, id, save)
    this.children.groups[id] = group
    this.children.groups = { ...this.children.groups } // FIXME: why it has to be that way?
    this.node.appendChild(group.node)

    return group
  }

  addSegment(name, id, save = true, callback) {
    const segment = new Segment(this, id, name, save, seg => {
      this.children.segments[id] = seg
      this.children.segments = { ...this.children.segments } // FIXME: why it has to be that way?
      this.node.appendChild(seg.node)
      callback && callback(seg)
    })
  }

  delete() {
    if (this.id === 1) return // root

    for (const group of Object.values(this.children.groups)) {
      group.delete()
    }

    for (const segment of Object.values(this.children.segments)) {
      segment.delete()
    }

    this.children.groups = []
    this.children.segments = []

    this.parent.children.groups[this.id].node.remove()
    delete this.parent.children.groups[this.id]
  }

  getRoot() {
    let id = this.id
    let obj = this
    while (id !== 1) {
      obj = obj.parent
      id = obj.id
    }

    return obj
  }

  toJSON() {
    const getChildrenGroups = () => {
      let entries = {}

      let groups = Object.values(this.children.groups)
      if (groups.length) {
        for (const group of groups) {
          // Source: https://stackoverflow.com/a/47116829
          entries = {...entries, ...group.toJSON()}
        }
      }

      return entries
    }

    const getChildrenSegments = () => {
      let entries = {}

      let segments = Object.values(this.children.segments)
      if (segments.length) {
        for (const segment of segments) {
          // Source: https://stackoverflow.com/a/47116829
          entries = {...entries, ...segment.toJSON()}
        }
      }

      return entries
    }

    return {
      [this.id]: {
        id: this.id,
        name: this.name,
        isSelected: this.isSelected,
        type: this.type,
        children: {
          groups: getChildrenGroups(),
          segments: getChildrenSegments()
        }
      }
    }
  }

  // Source: https://code-boxx.com/create-save-files-javascript/
  saveToFile() {
    let data = root.toJSON()
    data = JSON.stringify(data)

    const a = document.createElement('a')
    a.href = window.URL.createObjectURL(new Blob([data], { type: 'text/plain' }))
    a.download = 'save.fwo'
    a.click()
  }

  readFromFile(input) {
    const reader = new FileReader()
    reader.addEventListener('load', e => {
      console.log(e.target.result)
    })
    reader.readAsText(input.files[0])
  }
}

const Helpers = {
  findSegment(where, type, id) {
    let result = null
    where.children[type + 's'].some(el => {
      const comparison = el.id === id
      if (comparison) {
        result = el
      }

      return comparison
    })

    if (!result) {
      where.children.groups.some(el => {
        result = Helpers.findSegment(el, type, id)
        return result
      })
    }

    return result
  },

  move: (element, parent) => {
    if (element instanceof HTMLElement) {
      element = Helpers.findSegment(root, 'segment', element.dataset.id)
    }

    const type = element.type + 's'
    const id = element.node.getElementsByClassName('segment-button')[0].dataset.id

    delete element.parent.children[type][id]
    parent.children[type][id] = element
    parent.node.appendChild(element.node)
  }
}


class Segment {
  parent = null
  isSelected = false
  name = ''
  id = -1
  node = null
  id64 = new Uint64(this.id)
  type = 'segment'

  constructor (parent, id, name, save = true, callback) {
    if (!id) {
      throw new Error('ID is requred!')
    }

    if (!name) {
      name = id
    }

    this.id = id
    this.id64 = new Uint64(id)
    this.name = name
    this.parent = parent

    const node = this.getNodeById(id)

    if (!node) {
      this.addToNeuroglancer(id, () => {
        this.node = this.getNodeById(id)
        if (!this.node) return console.log('Organizer: incorrect segment ID')

        this.node.dataset.id = id
        callback && callback(this)
        if (save) {
          saveToiDB()
        }
      })

    }
    else {
      this.node = node
      this.node.dataset.id = id
      callback && callback(this)
      if (save) {
        saveToiDB()
      }
    }
  }

  addToNeuroglancer(id, callback) {
    const removeListener = displayState.rootSegments.changed.add((segId, wasAdded) => {
      if (!wasAdded || !Uint64.equal(segId, this.id64)) return

      removeListener()
      callback && callback()
    })
    displayState.rootSegments.add(this.id64)
  }

  getNodeById(id) {
    const segmentPatch = document.querySelector(`button[data-seg-id="${id}"]`)
    if (!segmentPatch) return null

    return segmentPatch.parentNode
  }

  delete() {
    displayState.rootSegments.delete(this.id64)
    delete this.parent.children.segments[this.id]
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      isSelected: this.isSelected,
      type: this.type
    }
  }
}


function generateCss() {
  return /*css*/`
    .kk-organizer-group {
      border-left: 1px solid white;
      border-radius: 10px;
      padding-left: 5px;
      margin: 2px;
      width: 90%;  
    }

    .kk-organizer-group-navbar-title {
      display: inline-block;
    }

    .kk-organizer-group-navbar-addsegments,
    .kk-organizer-group-navbar-addgroup,
    .kk-organizer-group-navbar-delete {
      display: inline-block;
      width: 10px;
      background-color: #777;
      padding: 0px 3px;
      margin-left: 3px;
      text-align: center;
    }
  `
}
