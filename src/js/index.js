// yet another speed dial
// copyright 2019 dev@conceptualspace.net
// absolutely no warranty is expressed or implied

'use strict';

// speed dial
const bookmarksContainerParent = document.getElementById('tileContainer');
const bookmarksContainer = document.getElementById('wrap');
const foldersContainer = document.getElementById('folders');
const addFolderButton = document.getElementById('addFolderButton');
const menu = document.getElementById('contextMenu');
const folderMenu = document.getElementById('folderMenu');
const settingsMenu = document.getElementById('settingsMenu');
const modal = document.getElementById('tileModal');
const modalContent = document.getElementById('tileModalContent');

const createDialModal = document.getElementById('createDialModal');
const createDialModalContent = document.getElementById('createDialModalContent');
const createDialModalURL = document.getElementById('createDialModalURL');
const createDialModalSave = document.getElementById('createDialModalSave');

const createFolderModal = document.getElementById('createFolderModal');
const createFolderModalContent = document.getElementById('createFolderModalContent');
const createFolderModalName = document.getElementById('createFolderModalName');
const createFolderModalSave = document.getElementById('createFolderModalSave');

const editFolderModal = document.getElementById('editFolderModal');
const editFolderModalContent = document.getElementById('editFolderModalContent');
const editFolderModalName = document.getElementById('editFolderModalName');
const editFolderModalSave = document.getElementById('editFolderModalSave');

const deleteFolderModal = document.getElementById('deleteFolderModal');
const deleteFolderModalContent = document.getElementById('deleteFolderModalContent');
const deleteFolderModalName = document.getElementById('deleteFolderModalName');
const deleteFolderModalSave = document.getElementById('deleteFolderModalSave');

const importExportModal = document.getElementById('importExportModal');
const importExportModalContent = document.getElementById('importExportModalContent');

const refreshAllModal = document.getElementById('refreshAllModal');
const refreshAllModalContent = document.getElementById('refreshAllModalContent');
const refreshAllModalSave = document.getElementById('refreshAllModalSave');

const toast = document.getElementById('toast');
const toastContent = document.getElementById('toastContent');

const closeModal = document.getElementsByClassName("close");
const modalSave = document.getElementById('modalSave');
const sidenav = document.getElementById("sidenav");
const modalTitle = document.getElementById("modalTitle");
const modalURL = document.getElementById("modalURL");
const modalImgContainer = document.getElementById("modalImgContainer");
const modalImgInput = document.getElementById("modalImgFile");
const noBookmarks = document.getElementById('noBookmarks');

// settings sidebar
const reader = new FileReader();
const color_picker = document.getElementById("color-picker");
const color_picker_wrapper = document.getElementById("color-picker-wrapper");
const textColor_picker = document.getElementById("textColor-picker");
const textColor_picker_wrapper = document.getElementById("textColor-picker-wrapper");
const imgInput = document.getElementById("file");
const imgPreview = document.getElementById("preview");
const previewOverlay = document.getElementById("previewOverlay");
const switchesContainer = document.getElementById("switchesContainer");
const wallPaperEnabled = document.getElementById("wallpaper");
const previewContainer = document.getElementById("previewContainer");
const backgroundColorContainer = document.getElementById("backgroundColorContainer");
const largeTilesInput = document.getElementById("largeTiles");
const rememberFolderInput = document.getElementById("rememberFolder");
const showTitlesInput = document.getElementById("showTitles");
const showCreateDialInput = document.getElementById("showCreateDial");
const showFoldersInput = document.getElementById("showFolders");
const showClockInput = document.getElementById("showClock");
const showSettingsBtnInput = document.getElementById("showSettingsBtn");
const maxColsInput = document.getElementById("maxcols");
const defaultSortInput = document.getElementById("defaultSort");
const importExportBtn = document.getElementById("importExportBtn");
const importExportStatus = document.getElementById('statusMessage');
const exportBtn = document.getElementById("exportBtn");
const importFileInput = document.getElementById("importFile");
const importFileLabel = document.getElementById("importFileLabel");
const helpBtn = document.getElementById("help");
const dialSizeInput = document.getElementById("dialSize");
const dialRatioInput = document.getElementById("dialRatio");

// clock
const clock = document.getElementById('clock');

const port = "p-" + new Date().getTime();
let tabMessagePort = null;

chrome.runtime.onMessage.addListener(handleMessages);

let cache = {};
let settings = null;
let speedDialId = null;
let sortable = null;
let targetTileHref = null;
let targetTileTitle = null;
let targetNode = null;
let targetFolder = null;
let targetFolderName = null;
let targetFolderLink = null;
let folders = [];
let currentFolder = null;
let scrollPos = 0;
let homeFolderTitle = browser.i18n.getMessage('home');
let windowSize = null;
let containerSize = null;
let layoutFolder = false;
let boxes = [];
let hourCycle = 'h12';
const locale = navigator.language;
const imageRatio = 1.54;
const helpUrl = 'https://conceptualspace.github.io/yet-another-speed-dial/';

let folderIds = [];

let defaults = {
    wallpaper: true,
    wallpaperSrc: 'img/bg.jpg',
    backgroundColor: '#111111',
    largeTiles: true,
    rememberFolder: false,
    showTitles: true,
    showAddSite: true,
    showFolders: true,
    showSettingsBtn: true,
    showClock: true,
    maxCols: '100',
    defaultSort: 'first',
    textColor: '#ffffff',
    dialSize: 'medium',
    dialRatio: 'wide'
};

const debounce = (func, delay= 500, immediate=false) => {
    let inDebounce
    return function() {
        const context = this
        const args = arguments
        if (immediate && !inDebounce) {
            func.apply(context, args);
            inDebounce = setTimeout(() => clearTimeout(inDebounce), delay)
        } else {
            clearTimeout(inDebounce)
            inDebounce = setTimeout(() => func.apply(context, args), delay)
        }
    }
}

// detect clock settings
hourCycle = Intl.DateTimeFormat(locale, {hour: 'numeric'}).resolvedOptions().hourCycle;

function displayClock() {
    clock.textContent = new Date().toLocaleString('en-US', {hour: 'numeric', minute: 'numeric', hourCycle: hourCycle});
    setTimeout(displayClock, 10000);
}

displayClock();

function getBookmarks(folderId) {
    browser.bookmarks.getChildren(folderId).then(result => {
        if (folderId === speedDialId && !result.length && settings.showFolders) {
            //noBookmarks.style.display = 'block';
            addFolderButton.style.display = 'none';
        }
        printBookmarks(result, folderId)
    }, error => {
        console.log(error);
    });
}

function removeBookmark(url) {
    let currentParent = currentFolder ? currentFolder : speedDialId
    browser.bookmarks.search({url})
        .then(bookmarks => {
            let cleanup = bookmarks.length < 2;
            for (let bookmark of bookmarks) {
                if (bookmark.parentId === currentParent) {
                    // animate removal
                    targetNode.style.display = "none";
                    layout(true);
                    // remove dial
                    targetNode.remove();
                    browser.bookmarks.remove(bookmark.id);
                    // if we have duplicates (ex in other folders), keep the image cache, otherwise purge it
                    if (cleanup) {
                        browser.storage.local.remove(url);
                    }
                }
            }
        })
}

function moveFolder(id, oldIndex, newIndex, newSiblingId) {
    let options = {};

    function move(id, options) {
        browser.bookmarks.move(id, options).then(result => {
            tabMessagePort.postMessage({refreshInactive: true})
        }).catch(err => {
            console.log(err);
        })
    }

    if (newSiblingId && newSiblingId !== -1) {
        browser.bookmarks.get(newSiblingId).then(result => {
            if (oldIndex >= newIndex) {
                options.index = Math.max(0, result[0].index);
            } else {
                options.index = Math.max(0, result[0].index - 1);
                // chrome-only off by 1 bug when moving a bookmark forward
                if (!browser.runtime.getBrowserInfo) {
                    options.index++;
                }
            }
            move(id, options);
        }).catch(err => {
            console.log(err);
        })
    } else {
        move(id, options);
    }
}

function moveBookmark(id, fromParentId, toParentId, oldIndex, newIndex, newSiblingId) {
    let options = {}

    function move(id, options) {
        browser.bookmarks.move(id, options).then(result => {
            tabMessagePort.postMessage({refreshInactive: true});
        }).catch(err => {
            console.log(err);
        });
    }

    if ((toParentId && fromParentId) && toParentId !== fromParentId) {
        options.parentId = toParentId;
    }

    // todo: refactor
    if (settings.defaultSort === "first") {
        if (newSiblingId && newSiblingId !== -1) {
            browser.bookmarks.get(newSiblingId).then(result => {
                if (toParentId === fromParentId && oldIndex >= newIndex) {
                    options.index = Math.max(0, result[0].index);
                    // chrome-only off by 1 bug when moving a bookmark forward
                    if (!browser.runtime.getBrowserInfo) {
                        options.index++;
                    }
                } else {
                    options.index = Math.max(0, result[0].index + 1);
                }
                move(id, options);
            }).catch(err => {
                console.log(err);
            })
        } else {
            if (!newSiblingId) {
                options.index = 0;
            }
            move(id, options);
        }
    } else {
        if (newSiblingId && newSiblingId !== -1) {
            browser.bookmarks.get(newSiblingId).then(result => {
                if (toParentId !== fromParentId || oldIndex >= newIndex) {
                    options.index = Math.max(0, result[0].index);
                } else {
                    options.index = Math.max(0, result[0].index - 1);
                    // chrome-only off by 1 bug when moving a bookmark forward
                    if (!browser.runtime.getBrowserInfo) {
                        options.index++;
                    }
                }
                move(id, options);
            }).catch(err => {
                console.log(err);
            })
        } else {
            move(id, options);
        }
    }
}

function showFolder(id) {
    hideSettings();
    let folders = document.getElementsByClassName('container');
    for (let folder of folders) {
        if (folder.id === id || (folder.id === 'wrap' && id === speedDialId)) {
            folder.style.display = "flex"
            folder.style.opacity = "0";
            layoutFolder = true;
            // transition between folders. todo more elegant solution
            setTimeout(function () {
                //layoutFolder = id;
                folder.style.opacity = "1";
                animate()
            }, 20);
        } else {
            folder.style.display = "none";
        }
    }
    // style the active tab
    let folderTitles = document.getElementsByClassName('folderTitle');
    for (let title of folderTitles) {
        if (title.attributes.folderid.value === id) {
            title.classList.add('activeFolder');
        } else {
            title.classList.remove('activeFolder');
        }
    }
}

function getThumbs(bookmarkUrl) {
    return browser.storage.local.get(bookmarkUrl)
        .then(result => {
            if (result[bookmarkUrl]) {
                return result[bookmarkUrl];
            }
        });
}

function printFolderBookmarks() {
    for (let folder of folders) {
        getBookmarks(folder)
    }
}

function folderLink(title, id) {
    let a = document.createElement('a');
    if (id === speedDialId) {
        a.id = "homeFolderLink";
    }
    //a.classList.add('tile');
    a.classList.add('folderTitle');
    a.setAttribute('folderId', id);
    let linkText = document.createTextNode(title);
    a.appendChild(linkText);
    //a.href = "#"+bookmark.id;
    a.onclick = function () {
        showFolder(id);
        currentFolder = id;
        scrollPos = 0;
        bookmarksContainerParent.scrollTop = scrollPos;
        chrome.storage.local.set({currentFolder: id});
        //tabMessagePort.postMessage({currentFolder: id});
    };

    // todo: allow dropping directly on folder title?
    a.ondragenter = dragenterHandler;
    a.ondragleave = dragleaveHandler;

    foldersContainer.appendChild(a);
}

function createFolder() {
    hideSettings();
    createFolderModalName.value = '';
    createFolderModalName.focus();
    createFolderModal.style.transform = "translateX(0%)";
    createFolderModal.style.opacity = "1";
    createFolderModalContent.style.transform = "scale(1)";
    createFolderModalContent.style.opacity = "1";
}

function saveFolder() {
    let name = createFolderModalName.value.trim();

    if (name.length) {
        browser.bookmarks.create({
            title: name,
            parentId: speedDialId
        }).then(node => {
            hideModals();
        });
    } else {
        hideModals();
    }
}

function editFolder() {
    let title = editFolderModalName.value.trim();
    browser.bookmarks.update(targetFolder, {
        title
    }).then(node => {
        hideModals();
    }).catch(err => {
        console.log(err);
    });
}

function refreshThumbnails(url) {
    //tabMessagePort.postMessage({refreshThumbs: true, url});
    
    toastContent.innerText = ` Capturing images...`;
    toast.style.transform = "translateX(0%)";
    chrome.runtime.sendMessage({target: 'background', type: 'refreshThumbs', data: {url}});
}

function removeFolder() {
    browser.bookmarks.removeTree(targetFolder).then(() => {
        hideModals();
        targetFolderLink.remove();
        folders.splice(folders.indexOf(targetFolder), 1);
        if (!folders.length) {
            document.getElementById('homeFolderLink').remove();
        }
        if (document.getElementById(targetFolder).style.display === 'flex') {
            showFolder(speedDialId);
        }
        document.getElementById(targetFolder).remove();
    });
}

function getChildren(folderId) {
    return new Promise((resolve, reject) => {
        browser.bookmarks.getChildren(folderId).then(children => {
            resolve(children);
        });
    });
}

function refreshAllThumbnails() {
    let urls = [];
    let parent = currentFolder ? currentFolder : speedDialId;
    
    hideModals();

    browser.bookmarks.getChildren(parent).then(children => {
        if (children && children.length) {
            for (let child of children) {
                if (child.url && (child.url.startsWith('https://') || child.url.startsWith('http://'))) {
                    urls.push(child.url);
                }
            }
            //tabMessagePort.postMessage({refreshAll: true, urls});
            chrome.runtime.sendMessage({target: 'background', type: 'refreshAllThumbs', data: {urls}});
            toastContent.innerText = ` Capturing images...`;
            toast.style.transform = "translateX(0%)";
        }
    }).catch(err => {
        console.log(err);
    });
}

// assumes 'bookmarks' param is content of a folder (from getBookmarks)
async function printBookmarks(bookmarks, parentId) {
    let fragment = document.createDocumentFragment();

    //let folderContainer = document.createElement('div');
    //folderContainer.id = parentId;
    //document.body.append(div)

    if (bookmarks) {
        for (let bookmark of bookmarks) {
            // folders
            // ignore subfolders for now
            if (!bookmark.url && bookmark.title && bookmark.parentId === speedDialId) {
                // setup "tabs" folder header links
                if (!folders.length) {
                    folderLink(homeFolderTitle, speedDialId)
                }
                if (folders.indexOf(bookmark.id) === -1) {
                    folders.push(bookmark.id);
                    folderLink(bookmark.title, bookmark.id)
                } else {
                    let el = document.querySelector(`[folderid="${bookmark.id}"]`);
                    if (el) {el.innerText = bookmark.title}
                }

            } else if (bookmark.url && bookmark.url.startsWith("http")) {
                // restricted to valid url schemes for security reasons -- http and https. see #26
                // in ff bookmark "separators" can be created that have "data:" as the url.
                let thumbBg, thumbUrl = null;
                if (cache[bookmark.url]) {
                    // if the image is a blob:
                    //iconURL = URL.createObjectURL(result.icon);
                    //iconURL = result.icon;
                    thumbUrl = cache[bookmark.url][0];
                    thumbBg = cache[bookmark.url][1]
                } else {
                    let images = await getThumbs(bookmark.url);
                    //console.log(images);
                    if (images) {
                        thumbUrl = images.thumbnails[0];
                        thumbBg = images.bgColor;
                        cache[bookmark.url] = [thumbUrl, thumbBg];
                    }
                }
                let a = document.createElement('a');
                a.classList.add('tile');
                a.href = bookmark.url;
                a.setAttribute('data-id', bookmark.id);

                let main = document.createElement('div');
                main.classList.add('tile-main');

                let content = document.createElement('div');
                content.classList.add('tile-content');
                if (thumbBg) {
                    content.style.backgroundImage = `url('${thumbUrl}'), ${thumbBg}`;
                } else {
                    // no image, use default
                    content.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
                }

                let title = document.createElement('div');
                title.classList.add('tile-title');
                if (!settings.showTitles) {
                    title.classList.add('hide');
                }
                title.textContent = bookmark.title;

                main.appendChild(content);
                main.appendChild(title);
                a.appendChild(main);
                fragment.appendChild(a);
            }
        }
    }

    // new dial button
    let aNewDial = document.createElement('a');
    aNewDial.classList.add('tile', 'createDial');
    aNewDial.onclick = function () {
        hideSettings();
        buildCreateDialModal(parentId);
        modalShowEffect(createDialModalContent, createDialModal);
    };
    let main = document.createElement('div');
    main.classList.add('tile-main');
    let content = document.createElement('div');
    content.classList.add('tile-content', 'createDial-content');
    main.appendChild(content);
    aNewDial.appendChild(main);

    // root speed dial dir
    if (parentId === speedDialId) {
        // populate folders divs
        if (folders.length) {
            printFolderBookmarks();
        }

        if (settings.defaultSort === "first") {
            let i = fragment.childNodes.length;
            while (i--)
                fragment.appendChild(fragment.childNodes[i]);
        }

        if (bookmarks.length) {
            fragment.appendChild(aNewDial);
        } else {
            // new install splash screen
            const noBookmarksDiv = document.createElement('div');
            noBookmarksDiv.className = 'default-content';
            noBookmarksDiv.id = 'noBookmarks';
            noBookmarksDiv.innerHTML = `
                <h1 class="default-content" data-locale="newInstall1">${browser.i18n.getMessage('newInstall1')}</h1>
                <p class="default-content helpText" data-locale="newInstall2">${browser.i18n.getMessage('newInstall2')}</p>
                <p class="default-content helpText" data-locale="newInstall3">${browser.i18n.getMessage('newInstall3')}</p>
                <p class="default-content helpText" data-locale="newInstall4">${browser.i18n.getMessage('newInstall4')}</p>
                <div class="cta-container">
                <p id="splashImport" class="default-content helpText cta" >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q25-92 100-149t170-57q117 0 198.5 81.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H520q-33 0-56.5-23.5T440-240v-206l-64 62-56-56 160-160 160 160-56 56-64-62v206h220q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-83-58.5-141.5T480-720q-83 0-141.5 58.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h100v80H260Zm220-280Z"/></svg>
                    Import
                </p>
                <p id="splashAddDial" class="default-content helpText cta" >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                Add Site
                </p>
                </div>
            `;
            fragment.appendChild(noBookmarksDiv);
        }
        bookmarksContainer.innerHTML = "";
        bookmarksContainer.appendChild(fragment);

        if (settings.rememberFolder && currentFolder && currentFolder !== speedDialId) {
            bookmarksContainer.style.opacity = "1";
            bookmarksContainer.style.display = "none";
        } else {
            //bookmarksContainer.style.display = "flex";
        }
        bookmarksContainer.style.opacity = "1";
        bookmarksContainerParent.scrollTop = scrollPos;
        animate();
        // we take care of this as part of "sort" fn now..
        //bookmarksContainer.style.opacity = "1";

    } else {
        // build a folder "tab"
        if (!document.getElementById(parentId)) {
            let folderContainer = document.createElement('div');
            folderContainer.id = parentId;
            folderContainer.classList.add('container');
            if (settings.rememberFolder && currentFolder === parentId) {
                folderContainer.style.display = 'flex';
                folderContainer.style.opacity = "0";
                setTimeout(function () {
                    //layoutFolder = id;
                    folderContainer.style.opacity = "1";
                    animate()
                }, 20);
                let titleEl = document.querySelectorAll(`[folderid="${currentFolder}"]`)[0];
                if (titleEl) {
                    titleEl.classList.add('activeFolder');
                }
            } else {
                folderContainer.style.display = 'none';
                folderContainer.style.opacity = "1";
            }
            //document.body.append(folderContainer);
            bookmarksContainerParent.append(folderContainer);
        }

        let folderContainerEl = document.getElementById(parentId);

        // todo: this is fubar
        let sortable = new Sortable(folderContainerEl, {
            group: 'shared',
            animation: 160,
            ghostClass: 'selected',
            dragClass: 'dragging',
            filter: ".createDial",
            delay: 500, // fixes #40
            delayOnTouchOnly: true,
            onMove: onMoveHandler,
            onEnd: onEndHandler
        });

        if (settings.defaultSort === "first") {
            let i = fragment.childNodes.length;
            while (i--)
                fragment.appendChild(fragment.childNodes[i]);
        }

        fragment.appendChild(aNewDial);

        // append bookmarks to container
        folderContainerEl.innerHTML = "";
        folderContainerEl.appendChild(fragment);

        //animate();
        bookmarksContainerParent.scrollTop = scrollPos;
        //
    }
}

function showContextMenu(el, top, left) {
    if ((document.body.clientWidth - left) < (el.clientWidth + 30)) {
        el.style.left = (left - el.clientWidth) + 'px';
    } else {
        el.style.left = left + 'px';
    }
    if ((document.body.clientHeight - top) < (el.clientHeight + 30)) {
        el.style.top = (top - el.clientHeight) + 'px';
    } else {
        el.style.top = top + 'px';
    }
    el.style.visibility = "visible";
    el.style.opacity = "1";
}

function hideMenus() {
    let menus = [menu, settingsMenu, folderMenu]
    for (let el of menus) {
        el.style.visibility = "hidden";
        el.style.opacity = "0";
    }
}

function openSettings() {
    sidenav.style.boxShadow = "0px 2px 8px 0px rgba(0,0,0,0.5)";
    sidenav.style.transform = "translateX(0%)";
}

function hideSettings() {
    sidenav.style.transform = "translateX(100%)";
    sidenav.style.boxShadow = "none";
}

function hideModals() {
    let modals = [modal, createDialModal, createFolderModal, editFolderModal, deleteFolderModal, refreshAllModal, importExportModal];
    let modalContents = [modalContent, createDialModalContent, createFolderModalContent, editFolderModalContent, deleteFolderModalContent, refreshAllModalContent, importExportModalContent]

    for (let button of document.getElementsByTagName('button')) {
        button.blur();
    }

    for (let input of document.getElementsByTagName('input')) {
        input.blur();
    }

    for (let el of modalContents) {
        el.style.transform = "scale(0.8)";
        el.style.opacity = "0";
    }

    for (let el of modals) {
        el.style.opacity = "0";
        setTimeout(function () {
            el.style.transform = "translateX(100%)";
        }, 160);
    }
}

function modalShowEffect(contentEl, modalEl) {
    modalEl.style.transform = "translateX(0%)";
    modalEl.style.opacity = "1";
    contentEl.style.transform = "scale(1)";
    contentEl.style.opacity = "1";
}

function hideToast() {
    toast.style.transform = "translateX(100%)";
    toastContent.innerText = '';
}

function buildCreateDialModal(parentId) {
    createDialModalURL.value = '';
    createDialModalURL.parentId = parentId ? parentId : speedDialId;
    createDialModalURL.focus();
}

async function buildModal(url, title) {
    // nuke any previous modal
    let carousel = document.getElementById("carousel");
    if (carousel) {
        modalImgContainer.removeChild(carousel);
    }

    let customCarousel = document.getElementById("customCarousel");
    if (customCarousel) {
        modalImgContainer.removeChild(customCarousel);
    }

    let newCarousel = document.createElement('div');
    newCarousel.setAttribute('id', 'carousel');
    modalImgContainer.appendChild(newCarousel);

    //let createdCarousel = document.getElementById('carousel');
    modalTitle.value = title;
    modalURL.value = url;
    let images = await getThumbs(url);
    if (images && images.thumbnails.length) {
        // clunky af
        // todo: support adding a custom image
        let index = images.thumbIndex;
        let imgDiv = document.createElement('div');
        let img = document.createElement('img');
        img.crossOrigin = 'Anonymous';
        img.setAttribute('src', images.thumbnails[index]);
        img.onerror = function() {
            img.setAttribute('src', 'img/default.png'); // todo: image is borked, cleanup
        };
        imgDiv.appendChild(img);
        newCarousel.appendChild(imgDiv);
        for (let [i, image] of images.thumbnails.entries()) {
            if (i !== index) {
                let imgDiv = document.createElement('div');
                let img = document.createElement('img');
                img.crossOrigin = 'Anonymous';
                img.setAttribute('src', image);
                img.onerror = function() {
                    img.setAttribute('src', 'img/default.png'); // todo: cleanup
                };
                imgDiv.appendChild(img);
                newCarousel.appendChild(imgDiv);
            }
        }
        $('#carousel').flexCarousel({height: '180px'});
    }
}

function rectifyUrl(url) {
    if (url && !url.startsWith('https://') && !url.startsWith('http://')) {
        return 'https://' + url;
    } else {
        return url;
    }
}

function createDial() {
    let url = rectifyUrl(createDialModalURL.value.trim());

    browser.bookmarks.create({
        title: url,
        url: url,
        parentId: createDialModalURL.parentId
    }).then(node => {
        hideModals();
        toastContent.innerText = ` Capturing images for ${url}...`;
        toast.style.transform = "translateX(0%)";
    });
}

function openAllTabs() {
    let folder = currentFolder ? document.getElementById(currentFolder) : document.getElementById('wrap');

    if (folder) {
        let dials = [...folder.getElementsByClassName('tile')];
        
        dials?.forEach(dial => {
            if (dial.href) {
                browser.tabs.create({
                    url: dial.href,
                    active: false
                });
            }
        });
    }
}

function offscreenCanvasShim(w, h) {
    try {
        return new OffscreenCanvas(w, h);
    } catch (err) {
        // offscreencanvas not supported in ff
        let canvas = document.createElement('canvas');
        canvas.width  = w;
        canvas.height = h;
        return canvas;
    }
}

// calculate the bg color of a given image
// todo: duped in offscreen logic; punt this to a worker
function getBgColor(img) {
    let imgWidth = img.naturalWidth;
    let imgHeight = img.naturalHeight;
    let canvas = offscreenCanvasShim(imgWidth, imgHeight);
    let context = canvas.getContext('2d', {willReadFrequently:true});
    context.drawImage(img, 0, 0);

    let totalPixels = 0;
    let avgColor = [0, 0, 0, 0];
    let colorCounts = {};
    let hasTransparentPixel = false;

    // background color algorithm
    // think the results are best when sampling 2 pixels deep from the edges
    // 1px gives bad results from image artifacts, more than 2px means we average away any natural framing/background in the image
    
    // Sample the top and bottom edges
    for (let x = 0; x < imgWidth; x += 2) { // Sample every other pixel
        for (let y = 0; y < 2; y++) {
            let pixelTop = context.getImageData(x, y, 1, 1).data;
            let pixelBottom = context.getImageData(x, imgHeight - 1 - y, 1, 1).data;
            let colorKeyTop = `${pixelTop[0]},${pixelTop[1]},${pixelTop[2]},${pixelTop[3]}`;
            let colorKeyBottom = `${pixelBottom[0]},${pixelBottom[1]},${pixelBottom[2]},${pixelBottom[3]}`;
            colorCounts[colorKeyTop] = (colorCounts[colorKeyTop] || 0) + 1;
            colorCounts[colorKeyBottom] = (colorCounts[colorKeyBottom] || 0) + 1;
            avgColor[0] += pixelTop[0] + pixelBottom[0];
            avgColor[1] += pixelTop[1] + pixelBottom[1];
            avgColor[2] += pixelTop[2] + pixelBottom[2];
            avgColor[3] += pixelTop[3] + pixelBottom[3];
            totalPixels += 2;
            if (pixelTop[3] < 255 || pixelBottom[3] < 255) {
                hasTransparentPixel = true;
            }
        }
    }

    // Sample the left and right edges
    for (let y = 2; y < imgHeight - 2; y += 2) { // Sample every other pixel
        for (let x = 0; x < 2; x++) {
            let pixelLeft = context.getImageData(x, y, 1, 1).data;
            let pixelRight = context.getImageData(imgWidth - 1 - x, y, 1, 1).data;
            let colorKeyLeft = `${pixelLeft[0]},${pixelLeft[1]},${pixelLeft[2]},${pixelLeft[3]}`;
            let colorKeyRight = `${pixelRight[0]},${pixelRight[1]},${pixelRight[2]},${pixelRight[3]}`;
            colorCounts[colorKeyLeft] = (colorCounts[colorKeyLeft] || 0) + 1;
            colorCounts[colorKeyRight] = (colorCounts[colorKeyRight] || 0) + 1;
            avgColor[0] += pixelLeft[0] + pixelRight[0];
            avgColor[1] += pixelLeft[1] + pixelRight[1];
            avgColor[2] += pixelLeft[2] + pixelRight[2];
            avgColor[3] += pixelLeft[3] + pixelRight[3];
            totalPixels += 2;
            if (pixelLeft[3] < 255 || pixelRight[3] < 255) {
                hasTransparentPixel = true;
            }
        }
    }

    avgColor = avgColor.map(color => color / totalPixels);
    avgColor[3] = avgColor[3] / 255; // Normalize alpha value

    let mostCommonColor = null;
    let maxCount = 0;
    for (let colorKey in colorCounts) {
        if (colorCounts[colorKey] > maxCount) {
            maxCount = colorCounts[colorKey];
            mostCommonColor = colorKey.split(',').map(Number);
        }
    }

    // todo: clean this up - set background and color separately

    if (maxCount > totalPixels / 2) {
        mostCommonColor[3] = mostCommonColor[3] / 255; // Normalize alpha value
        return(`linear-gradient(to bottom, rgba(${mostCommonColor[0]},${mostCommonColor[1]},${mostCommonColor[2]},${mostCommonColor[3]}) 50%, rgba(${mostCommonColor[0]},${mostCommonColor[1]},${mostCommonColor[2]},${mostCommonColor[3]}) 50%)`);
    } else {
        if (hasTransparentPixel) {
            avgColor[3] = 0; // Make the gradient transparent if any pixel is transparent
        }
        return(`linear-gradient(to bottom, rgba(${avgColor[0]},${avgColor[1]},${avgColor[2]},${avgColor[3]}) 50%, rgba(${avgColor[0]},${avgColor[1]},${avgColor[2]},${avgColor[3]}) 50%)`);
    }
}

function saveBookmarkSettings() {
    // todo: cleanup this abomination when im not on drugs
    let title = modalTitle.value;
    let url = targetTileHref;
    let newUrl = rectifyUrl(modalURL.value.trim());
    let selectedImageSrc = null;
    let thumbIndex = 0;
    let imageNodes = document.getElementsByClassName('fc-slide');
    let bgColor = null;

    let customCarousel = document.getElementById('customCarousel');
    if (customCarousel) {
        selectedImageSrc = customCarousel.children[0].src;
        bgColor = getBgColor(customCarousel.children[0]);
        targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
        //targetNode.children[0].children[0].style.backgroundColor = bgColor;
        browser.storage.local.get(url)
            .then(result => {
                let thumbnails = [];
                if (result[url]) {
                    thumbnails = result[url].thumbnails;
                    thumbnails.push(selectedImageSrc);
                    thumbIndex = thumbnails.indexOf(selectedImageSrc);
                } else {
                    thumbnails.push(selectedImageSrc);
                    thumbIndex = 0;
                }
                browser.storage.local.set({[newUrl]: {thumbnails, thumbIndex, bgColor}}).then(result => {
                    //tabMessagePort.postMessage({updateCache: true, url: newUrl, i: thumbIndex});
                    if (title !== targetTileTitle) {
                        updateTitle()
                    }
                });
            });
    } else {
        for (let node of imageNodes) {
            // div with order "2" is the one being displayed by the carousel
            if (node.style.order === '2') {
                // sometimes the carousel puts images inside a <figure class="fc-image"> elem
                if (node.children[0].className === "fc-image") {
                    selectedImageSrc = node.children[0].children[0].src;
                    bgColor = getBgColor(node.children[0].children[0]);
                } else {
                    selectedImageSrc = node.children[0].src;
                    bgColor = getBgColor(node.children[0]);
                }
                // update tile
                targetNode.children[0].children[0].style.backgroundImage = `url('${selectedImageSrc}'), ${bgColor}`;
                //targetNode.children[0].children[0].style.backgroundColor = bgColor;
                break;
            }
        }

        browser.storage.local.get(url)
            .then(result => {
                if (result[url]) {
                    let thumbnails = result[url].thumbnails;
                    thumbIndex = thumbnails.indexOf(selectedImageSrc);
                    if (thumbIndex >= 0) {
                        browser.storage.local.set({[newUrl]: {thumbnails, thumbIndex, bgColor}}).then(result => {
                            //tabMessagePort.postMessage({updateCache: true, url: newUrl, i: thumbIndex});
                            if (title !== targetTileTitle || url !== newUrl) {
                                updateTitle()
                            }
                        });
                    } else {
                        if (title !== targetTileTitle || url !== newUrl) {
                            updateTitle()
                        }
                    }
                } else {
                    if (title !== targetTileTitle || url !== newUrl) {
                        updateTitle()
                    }
                }
            });
    }

    // find image index
    function updateTitle() {
        // allow ui to respond immediately while bookmark updated
        //targetNode.children[0].children[1].textContent = title;
        // sortable ids changed so rewrite to storage
        //let order = sortable.toArray();
        //browser.storage.local.set({"sort":order});
        // todo: temp hack to match all until we start using bookmark ids
        browser.bookmarks.search({url})
            .then(bookmarks => {
                if (bookmarks.length <= 1 && ( url !== newUrl) ) {
                    // cleanup unused thumbnails
                    browser.storage.local.remove(url)
                }
                for (let bookmark of bookmarks) {
                    let currentParent = currentFolder ? currentFolder : speedDialId
                    if (bookmark.parentId === currentParent) {
                        browser.bookmarks.update(bookmark.id, {
                            title,
                            url: newUrl
                        });
                    }

                    if (url !== newUrl && toastContent.innerText === '') {
                        toastContent.innerText = ` Capturing images for ${newUrl}...`;
                        toast.style.transform = "translateX(0%)";
                    }
                }
            })
    }

    hideModals();
}

// todo: why did i debounce animate but not layout? (because we want tiles to move immediately as manually resizing window)
function layout(force = false) {
    if (force || layoutFolder || containerSize !== getComputedStyle(bookmarksContainer).maxWidth || windowSize !== window.innerWidth) {
        windowSize = window.innerWidth;
        containerSize = getComputedStyle(bookmarksContainer).maxWidth;

        let b = [];

        for (let i = 0; i < boxes.length; i++) {
            let box = boxes[i];
            const lastX = box.x;
            const lastY = box.y;
            // todo: we can make some assumptions to calculate this faster...
            box.x = box.node.offsetLeft;
            box.y = box.node.offsetTop;
            if (lastX !== box.x || lastY !== box.y) {
                const x = box.transform.x + lastX - box.x;
                const y = box.transform.y + lastY - box.y;
                // Tween to 0 to remove the transforms
                TweenMax.set(box.node, {x, y});
                b.push(box.node);
            }
        }
        // layoutFolder true on folder open -- zero duration because we are just setting the positions of the dials, so whenever
        // a resize occurs the animation will start from the right position
        let duration = layoutFolder ? 0 : 0.7;
        TweenMax.staggerTo(b, duration, {x: 0, y: 0, stagger:{amount: 0.2}, ease});
        layoutFolder = false;
    }
}

function ease(progress) {
    const omega = 12;
    const zeta = 0.8;
    const beta = Math.sqrt(1.0 - zeta * zeta);
    progress = 1 - Math.cos(progress * Math.PI / 2);
    progress = 1 / beta *
        Math.exp(-zeta * omega * progress) *
        Math.sin(beta * omega * progress + Math.atan(beta / zeta));
    return 1 - progress;
}

const animate = debounce(() => {
    let currentParent;
    if (currentFolder && currentFolder !== speedDialId) {
        currentParent = currentFolder
    } else {
        currentParent = "wrap"
    }
    const nodes = document.querySelectorAll(`[id="${currentParent}"] > .tile`);
    const total = nodes.length;

    TweenMax.set(nodes, {lazy: true, x: "+=0"});

    for (let i = 0; i < total; i++) {
        let node = nodes[i];
        const transform = node._gsTransform;
        const x = node.offsetLeft;
        const y = node.offsetTop;
        boxes[i] = {node, transform, x, y};
    }

    layout();

}, 500);

function readURL(input) {
    if (input.files && input.files[0]) {
        reader.readAsDataURL(input.files[0]);
    }
}

function resizeBackground(dataURI) {
    return new Promise(function (resolve, reject) {
        let img = new Image();
        img.onload = function () {
            if (this.height > screen.height) {
                let height = screen.height;
                let ratio = height / this.height;
                let width = Math.round(this.width * ratio);

                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d', {willReadFrequently:true});
                ctx.imageSmoothingEnabled = true;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(this, 0, 0, width, height);

                // todo: remove this whenever firefox supports webp. in meantime we fallback to jpg for speed
                if (browser.runtime.getBrowserInfo) {
                    const newDataURI = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(newDataURI);
                } else {
                    const newDataURI = canvas.toDataURL('image/webp', 0.87);
                    resolve(newDataURI);
                }
            } else {
                resolve(dataURI);
            }
        };
        img.src = dataURI;
    })
}

function resizeThumb(dataURI) {
    return new Promise(function (resolve, reject) {
        let img = new Image();
        img.onload = function () {
            if (this.height > 256 && this.width > 256) {
                // when im less lazy check use optimal w/h based on image
                // set height to 256 and scale
                let height = 256;
                let ratio = height / this.height;
                let width = Math.round(this.width * ratio);

                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d', {willReadFrequently:true});
                ctx.imageSmoothingEnabled = true;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(this, 0, 0, width, height);

                // webp encoding falls back to png on firefox
                const newDataURI = canvas.toDataURL('image/webp', 0.7);
                resolve(newDataURI);
            } else {
                resolve(dataURI);
            }
        };
        img.src = dataURI;
    })
}

function readImage(input) {
    return new Promise(function (resolve, reject) {
        let filereader = new FileReader();
        filereader.onload = function (e) {
            resolve(e.target.result);
        };
        if (input.files && input.files[0]) {
            filereader.readAsDataURL(input.files[0]);
        }
    });
}

//todo: deletability yo
function addImage(image) {
    let carousel = document.getElementById('carousel');
    if (carousel) {
        carousel.style.display = "none";
        let customCarousel = document.getElementById('customCarousel');
        if (customCarousel) {
            customCarousel.remove();
        }
        customCarousel = document.createElement('div');
        customCarousel.setAttribute('id', 'customCarousel');
        customCarousel.style.height = "180px";

        let preview = document.createElement('img');
        preview.style.height = '100%';
        preview.style.width = '100%';
        preview.style.objectFit = 'contain';
        preview.setAttribute('src', image);

        customCarousel.appendChild(preview);
        modalImgContainer.appendChild(customCarousel);
    }
}

function applySettings() {
    return new Promise(function (resolve, reject) {
        // apply settings to speed dial

        if (settings.wallpaper && settings.wallpaperSrc) {
            // perf hack for default gradient bg image. user selected images are data URIs
            if (settings.wallpaperSrc.length < 65) {
                document.body.style.background = `linear-gradient(135deg, #4387a2, #5b268d)`;
            } else {
                document.body.style.background = `url("${settings.wallpaperSrc}") no-repeat top center fixed`;
                document.body.style.backgroundSize = 'cover';
            }
        } else {
            document.body.style.background = settings.backgroundColor;
        }

        if (settings.textColor) {
            document.documentElement.style.setProperty('--color', settings.textColor);
        }

        /*
        if (settings.scaleImages) {
            document.documentElement.style.setProperty('--image-scaling', 'contain');
            //document.documentElement.style.setProperty('--image-width', '140px');
        } else {
            document.documentElement.style.setProperty('--image-scaling', 'cover');
            //document.documentElement.style.setProperty('--image-width', '188px');
        }
        */

        if (settings.maxCols && settings.maxCols !== "100") {
            document.documentElement.style.setProperty('--columns', settings.maxCols * 220 + "px")
            layout();
        } else {
            document.documentElement.style.setProperty('--columns', '100%')
            layout();
        }

        if (settings.dialSize && settings.dialSize !== "medium") {
            let dialWidth, dialHeight, dialContentHeight;
            switch (settings.dialSize) {
                case "large":
                    dialWidth = '256px';
                    dialHeight = settings.dialRatio === "square" ? '274px' : '162px';
                    dialContentHeight = settings.dialRatio === "square" ? '256px' : '144px';
                    break;
                case "small":
                    dialWidth = '178px';
                    dialHeight = settings.dialRatio === "square" ? '196px' : '118px';
                    dialContentHeight = settings.dialRatio === "square" ? '178px' : '100px';
                    break;
                case "x-small":
                    dialWidth = '130px';
                    dialHeight = settings.dialRatio === "square" ? '148px' : '100px';
                    dialContentHeight = settings.dialRatio === "square" ? '130px' : '82px';
                    break;
                default:
                    dialWidth = '220px';
                    dialHeight = settings.dialRatio === "square" ? '238px' : '142px';
                    dialContentHeight = settings.dialRatio === "square" ? '220px' : '124px';
            }
            document.documentElement.style.setProperty('--dial-width', dialWidth);
            document.documentElement.style.setProperty('--dial-height', dialHeight);
            document.documentElement.style.setProperty('--dial-content-height', dialContentHeight);
        } else {
            document.documentElement.style.setProperty('--dial-width', '220px');
            if (settings.dialRatio === "square") {
                document.documentElement.style.setProperty('--dial-height', '238px');
                document.documentElement.style.setProperty('--dial-content-height', '220px');
            } else {
                document.documentElement.style.setProperty('--dial-height', '142px');
                document.documentElement.style.setProperty('--dial-content-height', '124px');
            }
        }

        if (settings.showFolders) {
            document.documentElement.style.setProperty('--show-folders', 'inline');
        } else {
            document.documentElement.style.setProperty('--show-folders', 'none');
        }

        if (settings.showClock) {
            clock.style.setProperty('--clock', 'block');
        } else {
            clock.style.setProperty('--clock', 'none');
        }

        if (settings.showSettingsBtn) {
            settingsBtn.style.setProperty('--settings', 'block');
        } else {
            settingsBtn.style.setProperty('--settings', 'none');
        }

        if (!settings.showTitles) {
            document.documentElement.style.setProperty('--title-opacity', '0');
        } else {
            document.documentElement.style.setProperty('--title-opacity', '1');
        }

        if (!settings.showAddSite) {
            document.documentElement.style.setProperty('--create-dial-display', 'none');
        } else {
            document.documentElement.style.setProperty('--create-dial-display', 'block');
        }


        resolve();

        // populate settings nav
        wallPaperEnabled.checked = settings.wallpaper;
        color_picker.value = settings.backgroundColor;
        color_picker_wrapper.style.backgroundColor = settings.backgroundColor;
        textColor_picker.value = settings.textColor;
        textColor_picker_wrapper.style.backgroundColor = settings.textColor;
        showTitlesInput.checked = settings.showTitles;
        showCreateDialInput.checked = settings.showAddSite;
        largeTilesInput.checked = settings.largeTiles;
        showFoldersInput.checked = settings.showFolders;
        showClockInput.checked = settings.showClock;
        showSettingsBtnInput.checked = settings.showSettingsBtn;
        maxColsInput.value = settings.maxCols;
        dialSizeInput.value = settings.dialSize;
        dialRatioInput.value = settings.dialRatio;
        defaultSortInput.value = settings.defaultSort;
        rememberFolderInput.checked = settings.rememberFolder;

        if (settings.wallpaperSrc) {
            imgPreview.setAttribute('src', settings.wallpaperSrc);
            //imgPreview.style.display = 'block';
            imgPreview.onload = function(e) {
                if (settings.wallpaper) {
                    backgroundColorContainer.style.display = "none";
                    previewContainer.style.opacity = '1';
                    switchesContainer.style.transform = "translateY(0)";

                    //backgroundColorContainer.style.display = 'none';
                } else {
                    backgroundColorContainer.style.display = "flex";
                    previewContainer.style.opacity = '0';
                    switchesContainer.style.transform = `translateY(-${previewContainer.offsetHeight}px)`;
                }
            }
            imgPreview.onerror = function(e) {
                // reset to default on error with user image
                settings.wallpaperSrc = 'img/bg.jpg';
                imgPreview.setAttribute('src', settings.wallpaperSrc);
                browser.storage.local.set({settings});
            }
        }

    });
}

function saveSettings() {
    settings.wallpaper = wallPaperEnabled.checked;
    settings.wallpaperSrc = imgPreview.src;
    settings.backgroundColor = color_picker.value;
    settings.textColor = textColor_picker.value;
    settings.showTitles = showTitlesInput.checked;
    settings.showAddSite = showCreateDialInput.checked;
    settings.largeTiles = largeTilesInput.checked;
    settings.showFolders = showFoldersInput.checked;
    settings.showClock = showClock.checked;
    settings.showSettingsBtn = showSettingsBtn.checked;
    settings.maxCols = maxColsInput.value;
    settings.dialSize = dialSizeInput.value;
    settings.dialRatio = dialRatioInput.value;
    settings.defaultSort = defaultSortInput.value;
    settings.rememberFolder = rememberFolderInput.checked;

    applySettings();

    browser.storage.local.set({settings})
        .then(() => {
            /*
            settingsToast.style.opacity = "1";
            setTimeout(function () {
                settingsToast.style.opacity = "0";
            }, 3500);
             */

            //tabMessagePort.postMessage({updateSettings: true});
        });
}

// override context menu
document.addEventListener("contextmenu", function (e) {
    if (e.target.type === 'text' && (e.target.id === 'modalTitle' || e.target.id === 'modalURL' || e.target.id === 'createDialModalURL')) {
        return;
    }
    e.preventDefault();
    // prevent settings from being opened and immediately hidden when right-clicking the gear icon
    if (e.target.id === 'settingsDiv') {
        return;
    }
    hideSettings();
    if (e.target.className === 'tile-content') {
        targetNode = e.target.parentElement.parentElement;
        targetTileHref = e.target.parentElement.parentElement.href;
        targetTileTitle = e.target.nextElementSibling.innerText;
        showContextMenu(menu, e.pageY, e.pageX);
        return false;
    } else if (e.target.classList.contains('folderTitle') && e.target.id !== "homeFolderLink") {
        targetFolderLink = e.target;
        targetFolder = e.target.attributes.folderId.nodeValue;
        targetFolderName = e.target.textContent;
        showContextMenu(folderMenu, e.pageY, e.pageX);
        return false;
    } else if (e.target.className === 'folders' || e.target.className === 'container' || e.target.className === 'tileContainer' || e.target.className === 'cta-container' || e.target.className === 'default-content' || e.target.className === 'default-content helpText') {
        showContextMenu(settingsMenu, e.pageY, e.pageX);
        return false;
    }
});

// todo: tidy this up
window.addEventListener("click", e => {
    if (typeof e.target.className === 'string' && e.target.className.indexOf('settingsCtl') >= 0) {
        return;
    }
    if (e.target.className === 'tile-content' || e.target.className === 'tile-title') {
        return;
    }
    e.preventDefault();
});

// listen for menu item
window.addEventListener("mousedown", e => {
    hideMenus();
    if (e.target.type === 'text' || e.target.id === 'maxcols' || e.target.id === 'defaultSort' || e.target.id === 'dialSize' || e.target.id === 'dialRatio') {
        return
    }
    if (e.target.className.baseVal === 'gear') {
        openSettings();
        return;
    }
    if (e.target.id === 'splashAddDial') {
        e.preventDefault();
        buildCreateDialModal(currentFolder);
        modalShowEffect(createDialModalContent, createDialModal);
        return;
    }
    if (e.target.id === 'splashImport') {
        e.preventDefault();
        modalShowEffect(importExportModalContent, importExportModal);
        //importFileInput.click();
        return;
    }
    switch (e.target.className) {
        // todo: invert this
        case 'default-content':
        case 'default-content helpText':
        case 'tile-content':
        case 'tile-title':
        case 'container':
        case 'tileContainer':
        case 'cta-container':
        case 'folders':
            hideSettings();
            break;
        case 'modal':
            hideModals();
            break;
        case 'menu-option':
            switch (e.target.id) {
                case 'openSettings':
                    openSettings();
                    break;
                case 'newTab':
                    browser.tabs.create({url: targetTileHref});
                    break;
                case 'newWin':
                    browser.windows.create({"url": targetTileHref});
                    break;
                case 'newPrivate':
                    browser.windows.create({"url": targetTileHref, "incognito": true});
                    break;
                case 'openAll':
                    openAllTabs();
                    break;
                case 'edit':
                    buildModal(targetTileHref, targetTileTitle).then(() => {
                        modalShowEffect(modalContent, modal);
                    });
                    break;
                case 'refresh':
                    refreshThumbnails(targetTileHref);
                    break;
                case 'refreshAll':
                    modalShowEffect(refreshAllModalContent, refreshAllModal);
                    break;
                case 'delete':
                    removeBookmark(targetTileHref);
                    break;
                case 'editFolder':
                    //buildFolderModal(targetFolder, targetFolderName);
                    editFolderModalName.value = targetFolderName;
                    modalShowEffect(editFolderModalContent, editFolderModal);
                    break;
                case 'deleteFolder':
                    deleteFolderModalName.textContent = targetFolderName;
                    modalShowEffect(deleteFolderModalContent, deleteFolderModal);
                    break;
                case 'newDial':
                    // prevent default required to stop focus from leaving the modal input
                    e.preventDefault();
                    buildCreateDialModal(currentFolder);
                    modalShowEffect(createDialModalContent, createDialModal);
                    break;
                case 'newFolder':
                    e.preventDefault();
                    createFolder();
                    break;
            }
            break;
        default:
            e.preventDefault();
    }
});

window.addEventListener("keydown", event => {
    if (event.code === "Escape") {
        hideMenus();
        hideModals();
    }
});

modalSave.addEventListener("click", saveBookmarkSettings);
createDialModalSave.addEventListener("click", createDial);
addFolderButton.addEventListener("click", createFolder);
createFolderModalSave.addEventListener("click", saveFolder)
editFolderModalSave.addEventListener("click", editFolder)
deleteFolderModalSave.addEventListener("click", removeFolder);
refreshAllModalSave.addEventListener("click", refreshAllThumbnails);

for (let button of closeModal) {
    button.onclick = function (e) {
        e.preventDefault();
        hideModals();
    };
}

modalTitle.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        saveBookmarkSettings();
    }
});

modalURL.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        saveBookmarkSettings();
    }
});

createDialModalURL.addEventListener('keydown', e => {
    if (e.code === "Enter") {
        e.preventDefault();
        createDial();
    }
});

modalImgInput.onchange = function () {
    readImage(this).then(image => {
        resizeThumb(image).then(resizedImage => {
            addImage(resizedImage);
        })
    });
};


maxColsInput.oninput = function(e) {
    saveSettings()
}

dialSizeInput.oninput = function(e) {
    saveSettings()
}

dialRatioInput.oninput = function(e) {
    saveSettings()
}

defaultSortInput.oninput = function(e) {
    if (settings.defaultSort !== defaultSortInput.value) {
        processRefresh();
        saveSettings()
    }
}

wallPaperEnabled.oninput = function(e) {
    saveSettings()
}

color_picker.onchange = function () {
    color_picker_wrapper.style.backgroundColor = color_picker.value;
    saveSettings()
};

textColor_picker.onchange = function () {
    textColor_picker_wrapper.style.backgroundColor = textColor_picker.value;
    if (settings.textColor !== textColor_picker.value) {
        saveSettings()
    }
};

showTitlesInput.oninput = function(e) {
    saveSettings()
}

showCreateDialInput.oninput = function(e) {
    saveSettings()
}

showFoldersInput.oninput = function(e) {
    saveSettings()
}

showClockInput.oninput = function(e) {
    saveSettings()
}

rememberFolderInput.oninput = function(e) {
    saveSettings()
}

showSettingsBtnInput.oninput = function(e) {
    saveSettings()
}

reader.onload = function (e) {
    resizeBackground(e.target.result).then(imagedata => {
        imgPreview.setAttribute('src', imagedata);
        imgPreview.style.display = 'block';
        // dynamically set text color based on background
        /*
        getAverageRGB(imagedata).then(rgb => {
            let textColor = contrast(rgb);
            settings.textColor = textColor
            document.documentElement.style.setProperty('--color', textColor);
        });
         */
        saveSettings()
    })
};

imgInput.onchange = function () {
    readURL(this);
};

previewOverlay.onclick = function() {
    imgInput.click();
}

function prepareExport() {
    browser.storage.local.get(null).then(function(items) {
        // filter out unused thumbnails to keep exported file efficient
        let filteredItems = {};
        for (const [key, value] of Object.entries(items)) {
            if (key.startsWith('http')) {
                let thumbnails = [];
                let thumbIndex = 0;
                let bgColor = null;

                if (value.thumbnails && value.thumbnails.length) {
                    thumbnails.push(value.thumbnails[value.thumbIndex]);
                }
                if (value.bgColor) {
                    bgColor = value.bgColor;
                }
                filteredItems[key] = {
                    thumbnails: thumbnails,
                    thumbIndex: thumbIndex,
                    bgColor: value.bgColor
                };
            } else if (key.startsWith('settings')) {
                filteredItems[key] = value;
            }
        }

        // save as file; requires downloads permission
        const blob = new Blob([JSON.stringify(filteredItems)], {type: 'application/json'})
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;

        exportBtn.setAttribute('href', URL.createObjectURL(blob));
        exportBtn.download = `yasd-export-${dateString}.json`;
        exportBtn.classList.remove('disabled');

    });
}

importExportBtn.onclick = function() {
    hideSettings();
    importExportStatus.innerText = "";
    exportBtn.classList.add('disabled');
    prepareExport();
    modalShowEffect(importExportModalContent, importExportModal);
}

helpBtn.onclick = function() {
    browser.tabs.create({ url: helpUrl });
}

importFileLabel.onclick = function() {
    importFileInput.click();
}

importFileInput.onchange = function (event) {
    let filereader = new FileReader();

    filereader.onload = function (event) {
        let json = null;
        if (event && event.target) {
            try {
                json = JSON.parse(event.target.result);
            } catch (err) {
                console.log(err)
                importExportStatus.innerText = "Error! Unable to parse file."
            }
        }

        // todo: improve error handling
        if (json && json.dials && json.groups) {
            // import from sd2
            let bookmarks = json.dials.map(dial => ({
                title: dial.title,
                url: dial.url,
                idgroup: dial.idgroup
            }));

            let groups = json.groups.map(group => ({
                id: group.id,
                title: group.title
            }));

            // clear previous settings and import
            // todo: we dont wana nuke everything if we dont end up proceeding with the import
            chrome.storage.local.clear().then(() => {

                // Create groups and bookmarks
                let groupPromises = groups.map(group => {
                    if (group.id === 0) {
                        return Promise.resolve(speedDialId);
                    } else {
                        return chrome.bookmarks.search({title: group.title}).then(existingGroups => {
                            const matchingGroups = existingGroups.filter(group => group.parentId === speedDialId);
                            if (matchingGroups.length > 0) {
                                return matchingGroups[0].id;
                            } else {
                                return chrome.bookmarks.create({
                                    title: group.title,
                                    parentId: speedDialId
                                }).then(node => node.id);
                            }
                        });
                    }
                });

                Promise.all(groupPromises).then(groupIds => {
                    bookmarks.forEach(bookmark => {
                        let parentId = groupIds[bookmark.idgroup];
                        chrome.bookmarks.search({url: bookmark.url}).then(existingBookmarks => {
                            let existsInFolder = existingBookmarks.some(b => b.parentId === parentId);
                            if (!existsInFolder) {
                                chrome.bookmarks.create({
                                    title: bookmark.title,
                                    url: bookmark.url,
                                    parentId: parentId
                                });
                            }
                        });
                    });

                    hideModals();
                    // refresh page
                    processRefresh();
                }).catch(err => {
                    console.log(err)
                    importExportStatus.innerText = "Error! Unable to create folders."
                });

            }).catch(err => {
                console.log(err)
                importExportStatus.innerText = "Something went wrong. Please try again"
            });
        } else if (json) {
            // import from yasd
            // clear previous settings and import
            browser.storage.local.clear().then(() => {
                browser.storage.local.set(json).then(result => {
                    hideModals();
                    // refresh page
                    //tabMessagePort.postMessage({handleImport: true});
                    processRefresh();
                }).catch(err => {
                    console.log(err)
                    importExportStatus.innerText = "Error! Unable to parse file."
                });
            }).catch(err => {
                console.log(err)
                importExportStatus.innerText = "Error! Please try again"
            })
        }
    };

    if (event && event.target && event.target.files) {
        filereader.readAsText(event.target.files[0]);
    }
};

// native handlers for folder tab target
function dragenterHandler(ev) {
    // temporary fix for firefox < v92
    // firefox returns a text node instead of an element
    if (ev.target.nodeType === 3) {
        if (ev.target.parentElement.classList.contains("folderTitle")) {
            // avoid repaints
            if (currentFolder !== ev.target.parentElement.attributes.folderid.value) {
                currentFolder = ev.target.parentElement.attributes.folderid.value;
                showFolder(currentFolder)
            }
        }
    }
    else if (ev.target.classList.contains("folderTitle")) {
        // avoid repaints
        // todo replace style changes with class;
        if (currentFolder !== ev.target.attributes.folderid.value) {
            ev.target.style.padding = "20px";
            ev.target.style.outline = "2px dashed white";
            currentFolder = ev.target.attributes.folderid.value;
            showFolder(currentFolder)
        }
    }
}

function dragleaveHandler(ev) {
    // temporary fix for firefox < v92
    if (ev.target.nodeType === 3) {
        return
    }
    else if (ev.target.classList.contains("folderTitle")) {
        ev.target.style.padding = "0";
        ev.target.style.outline = "none";
    }
}

// Sortable helper fns
function onMoveHandler(evt) {
    if (evt.related) {
        if (evt.to.children.length > 1) {
            // when no bookmarks are present we keep the createdial enabled so we have a drop target for dials dragged into folder
            return !evt.related.classList.contains('createDial');
        } else {
            // force new dial to drop before add dial button
            evt.to.prepend(evt.dragged);
            return false;
        }
    }
}

function dewrap(str) {
    // unlike folder tabs, main dial container doesnt include the folder id
    // todo: cleanup
    if (str === "wrap") {
        return speedDialId
    } else {
        return str
    }
}

function onEndHandler(evt) {
    if (evt && evt.clone.href) {
        let id = evt.clone.dataset.id;
        let fromParentId = dewrap(evt.from.id);
        let toParentId = dewrap(evt.to.id);
        let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.dataset.id : null;
        let newSiblingParentId = newSiblingId ? dewrap(evt.item.nextElementSibling.parentElement.id) : null;
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;

        // todo: test if this is needed
        if (fromParentId !== toParentId && toParentId !== evt.originalEvent.target.id) {
            // sortable's position doesn't match the dom's drop target
            // this may happen if the tile is dragged over a sortable list but then ultimately dropped somewhere else
            // for example directly on the folder name, or directly onto the new dial button. so use the currentFolder as the target
            toParentId = currentFolder ? currentFolder : speedDialId;
        }

        if (fromParentId === toParentId && fromParentId !== currentFolder) {
            // occurs when there is no sortable target -- for example dropping the dial onto the folder name
            // or some space of the page outside the sortable container element
            toParentId = currentFolder ? currentFolder : speedDialId;
        }

        // if the sibling's parent doesnt match the parent we are moving to discard this sibling
        // can occur when dropping onto a non sortable target (like folder name)
        if (newSiblingParentId && newSiblingParentId !== toParentId) {
            newSiblingId = -1 ;
        }

        if ((fromParentId && toParentId && fromParentId !== toParentId) || oldIndex !== newIndex ) {
            moveBookmark(id, fromParentId, toParentId, oldIndex, newIndex, newSiblingId)
        }
    } else if (evt && evt.clone.classList.contains('folderTitle')) {
        let oldIndex = evt.oldIndex;
        let newIndex = evt.newIndex;

        if (newIndex !== oldIndex) {
            if (evt.clone.attributes.folderid) {
                let id = evt.clone.attributes.folderid.value;
                let newSiblingId = evt.item.nextElementSibling ? evt.item.nextElementSibling.attributes.folderid.value : null;
                moveFolder(id, oldIndex, newIndex, newSiblingId)
            }
        }
    }
}

const processRefresh = debounce(() => {
    // prevent page scroll on refresh
    // react where are you...
    scrollPos = bookmarksContainerParent.scrollTop;
    //noBookmarks.style.display = 'none';
    addFolderButton.style.display = 'inline';

    //bookmarksContainer.style.opacity = "0";

    getBookmarks(speedDialId)
}, 650, true);

function getSpeedDialId() {
    return new Promise((resolve, reject) => {
        chrome.bookmarks.search({title: 'Speed Dial'}).then(result => {
            if (result) {
                for (let bookmark of result) {
                    if (!bookmark.url) {
                        speedDialId = bookmark.id;
                        break;
                    }
                }
            }
            if (speedDialId) {
                chrome.bookmarks.getChildren(speedDialId).then(results => {
                    for (let result of results) {
                        if (!result.url && result.title) {
                            folderIds.push(result.id);
                        }
                    }
                })
                resolve()
            } else {
                chrome.bookmarks.create({title: 'Speed Dial'}).then(result => {
                    speedDialId = result.id;
                    resolve();
                }, error => {
                    reject(error);
                });
            }
        }, error => {
            reject(error)
        });
    });
}

function handleMessages(message) {
    //console.log(m);
    if (!message.target === 'newtab') {
        return
    }

    if (message.data.refresh) {
        hideToast();
        processRefresh();
    }
}

function init() {

    document.querySelectorAll('[data-locale]').forEach(elem => {
        elem.innerText = browser.i18n.getMessage(elem.dataset.locale)
    })

    

    // init what used to be background work"
    // build a thumbnail cache of url:thumbUrl pairs
    // todo: slow; lets get the current tab first
    chrome.storage.local.get().then(result => {
        if (result) {
            if (result.settings) {
                settings = Object.assign({}, defaults, result.settings);
            } else {
                settings = defaults;
            }
            if (settings.rememberFolder && result.currentFolder) {
                currentFolder = result.currentFolder;
                //todo: reset to home folder when setting turned off
            }
            const entries = Object.entries(result);
            for (let e of entries) {
                //console.log(e);
                // todo: filter folder ids
                if (e[0] !== "settings" && e[1].thumbnails) {
                    let index = e[1].thumbIndex;
                    cache[e[0]] = [e[1].thumbnails[index], e[1].bgColor];
                }
            }
        }
        getSpeedDialId().then(() => {
            applySettings().then(() => getBookmarks(speedDialId));
        }, error => {
            console.log(error);
        });
    });



    sidenav.style.display = "flex";

    sortable = new Sortable(bookmarksContainer, {
        //todo: forceFallback:true seems to work way better on chrome on *linux* (no dif on win/mac)
        //forceFallback: true,
        group: 'shared',
        animation: 160,
        ghostClass: 'selected',
        dragClass: 'dragging', // todo: confirm this only applies when forceFallback is used
        filter: ".createDial",
        delay: 500, // fixes #40
        delayOnTouchOnly: true,
        // todo: copy same onmove logic from folders
        onMove: onMoveHandler,
        onEnd: onEndHandler
    });

    new Sortable(foldersContainer, {
        animation: 150,
        forceFallback: true,
        fallbackTolerance: 4,
        filter: "#homeFolderLink",
        ghostClass: 'selected',
        onMove: function (evt) {
            return evt.related.id !== 'homeFolderLink';
        },
        onEnd: onEndHandler
    });

    window.onresize = layout;

}

init();
