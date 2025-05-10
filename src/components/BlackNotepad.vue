<template>
  <div v-if="currentUser" class="app-container" :class="{ 'light-mode': isLightMode }">
    <div class="user-controls">
    <button class="user-email-btn">
      <span class="user-email">{{ currentUser.email }}</span>
    </button>
    <button @click="handleLogout" class="logout-btn">Logout</button>
    <button @click="showDocumentList = !showDocumentList" class="documents-btn">
      {{ showDocumentList ? 'Hide Documents' : 'My Documents' }}
    </button>
    <button @click="createNewDocument" class="new-doc-btn">+ New</button>
  </div>

  <div v-if="showDocumentList" class="document-list" :class="{ 'light-mode': isLightMode }">
    <div 
      v-for="doc in userDocuments" 
      :key="doc.id" 
      class="document-item"
      :class="{ 'active': currentDocumentId === doc.id }"
      @click="loadDocument(doc.id)"
    >
      <span class="doc-title">{{ doc.title || 'Untitled' }}</span>
      <span class="doc-date">{{ formatDate(doc.updatedAt) }}</span>
      <button @click.stop="deleteDocument(doc.id)" class="delete-doc-btn">×</button>
    </div>
  </div>

    <div class="notepad-container" :class="{ 'fullscreen': isFullscreen }" ref="notepadContainer">
      <div class="notepad-content">
        <div class="title-container">
          <h1
            class="title"
            contenteditable="true"
            ref="titleEditable"
            @blur="saveTitle"
            @keydown.enter.prevent="blurTitle"
          >{{ currentTitle }}</h1>
          <p class="subtitle">
            by
            <span
              contenteditable="true"
              ref="subtitleEditable"
              @blur="saveSubtitle"
              @keydown.enter.prevent="blurSubtitle"
              :class="{ 'editable-link': !subtitleLinkDisabled }"
              v-html="formattedSubtitleHtml"
            ></span>
          </p>
        </div>

        <div class="toolbar">
          <div class="toolbar-left">
            <button class="mode-toggle" @click="toggleMode" @touchstart.prevent="toggleMode">
              {{ isLightMode ? '🌙 Dark' : '☀️ Light' }}
            </button>
            <button class="save-state-prompt" @click="saveContent" @touchstart.prevent="saveContent">
              {{ saveStateText }}
            </button>
            <span class="auto-save-indicator" v-if="autoSaveEnabled">
              Auto-save: {{ autoSaveStatus }}
            </span>
          </div>

          <div class="toolbar-right">
            <button
              class="format-btn"
              @click="formatText('bold')"
              title="Bold (Ctrl+B)"
              :class="{ 'active': activeFormats.bold }"
            >
              <b>B</b>
            </button>
            <button
              class="format-btn"
              @click="formatText('italic')"
              title="Italic (Ctrl+I)"
              :class="{ 'active': activeFormats.italic }"
            >
              <i>I</i>
            </button>
            <button
              class="format-btn"
              @click="formatText('underline')"
              title="Underline (Ctrl+U)"
              :class="{ 'active': activeFormats.underline }"
            >
              <u>U</u>
            </button>
            <button
              class="format-btn"
              @click="formatText('insertUnorderedList')"
              title="Bullet List"
              :class="{ 'active': activeFormats.unorderedList }"
            >
              • List
            </button>
            <button
              class="format-btn"
              @click="formatText('insertOrderedList')"
              title="Numbered List"
              :class="{ 'active': activeFormats.orderedList }"
            >
              1. List
            </button>
            <button
              class="format-btn align-left"
              @click="formatText('justifyLeft')"
              title="Align Left"
              :class="{ 'active': activeFormats.alignLeft }"
            >
              ≡
            </button>
            <button
              class="format-btn align-center"
              @click="formatText('justifyCenter')"
              title="Center"
              :class="{ 'active': activeFormats.alignCenter }"
            >
              ⋮
            </button>
            <button
              class="format-btn align-right"
              @click="formatText('justifyRight')"
              title="Align Right"
              :class="{ 'active': activeFormats.alignRight }"
            >
              ≡
            </button>
          </div>
        </div>

        <div
          class="editable-area"
          ref="editableArea"
          contenteditable="true"
          @input="handleInput"
          @keydown="handleKeyDown"
          @touchstart="handleTouchStart"
          @mouseup="checkActiveFormats"
          @keyup="checkActiveFormats"
          @focus="checkActiveFormats"
          @blur="checkActiveFormats"
        ></div>
      </div>

      <div class="control-buttons">
        <button class="fullscreen-toggle" @click="toggleFullscreen" @touchstart.prevent="toggleFullscreen">
          {{ isFullscreen ? '⤢ Exit Fullscreen' : '⤢ Fullscreen' }}
        </button>
      </div>
    </div>
  </div>

  <AuthView v-else @login="handleLogin" />
</template>

<script>
import { getAuth, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  collection, query, where, getDocs, doc, getDoc, 
  setDoc, deleteDoc, serverTimestamp, onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import AuthView from './AuthView.vue';

export default {
  name: 'BlackNotepad',
  components: {
    AuthView
  },
  data() {
    return {
      currentUser: null,
      currentDocumentId: null,
      userDocuments: [],
      showDocumentList: false,
      isFullscreen: false,
      isLightMode: false,
      saveStateText: "Save",
      currentTitle: "Notepad",
      currentSubtitle: "0fReDesign.tech",
      subtitleLinkDisabled: false,
      originalSubtitle: "0fReDesign.tech",
      autoSaveEnabled: true,
      autoSaveStatus: "Off",
      autoSaveInterval: null,
      saveTimeout: null,
      contentChanged: false,
      activeFormats: {
        bold: false,
        italic: false,
        underline: false,
        unorderedList: false,
        orderedList: false,
        alignLeft: true,
        alignCenter: false,
        alignRight: false,
      },
      unsubscribeDocument: null
    }
  },
  computed: {
    formattedSubtitleHtml() {
      const text = this.currentSubtitle;
      const formattedText = text.replace(/0/g, '<span class="mono-zero">0</span>');
      return `${formattedText}<a href="0fredesign.tech"></a>`;
    },
    sortedDocuments() {
      return [...this.userDocuments].sort((a, b) => {
        const dateA = a.updatedAt?.seconds || a.createdAt?.seconds || 0;
        const dateB = b.updatedAt?.seconds || b.createdAt?.seconds || 0;
        return dateB - dateA; // Newest first
      });
    }
  },
  created() {
    const auth = getAuth();
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      if (user) {
        await this.loadUserDocuments();
        if (this.userDocuments.length > 0) {
          await this.loadDocument(this.userDocuments[0].id);
        } else {
          await this.createNewDocument();
        }
        this.startAutoSave();
      } else {
        this.stopAutoSave();
      }
    });
  },
  mounted() {
    this.$refs.editableArea?.focus();
    document.addEventListener('fullscreenchange', this.handleFullscreenChange);
    document.addEventListener('keydown', this.handleSaveKeyDown);
    document.addEventListener('keydown', this.handleFormatShortcuts);
    document.addEventListener('selectionchange', this.checkActiveFormats);

    this.observer = new MutationObserver(this.handleContentChange);
    if (this.$refs.editableArea) {
      this.observer.observe(this.$refs.editableArea, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    document.body.style.overscrollBehavior = 'none';
  },
  beforeUnmount() {
    document.removeEventListener('fullscreenchange', this.handleFullscreenChange);
    document.removeEventListener('keydown', this.handleSaveKeyDown);
    document.removeEventListener('keydown', this.handleFormatShortcuts);
    document.removeEventListener('selectionchange', this.checkActiveFormats);
    if (this.observer) this.observer.disconnect();
    if (this.unsubscribeDocument) this.unsubscribeDocument();
    this.stopAutoSave();
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    document.body.style.overscrollBehavior = '';
  },
  methods: {
    async handleLogin(user) {
      this.currentUser = user;
      await this.loadUserDocuments();
      if (this.userDocuments.length > 0) {
        await this.loadDocument(this.sortedDocuments[0].id);
      } else {
        await this.createNewDocument();
      }
    },
    async handleLogout() {
      try {
        const auth = getAuth();
        await signOut(auth);
        this.currentUser = null;
        this.currentDocumentId = null;
        this.userDocuments = [];
      } catch (error) {
        console.error("Logout error:", error);
      }
    },
    async loadUserDocuments() {
      if (!this.currentUser) return;
      
      try {
        const q = query(
          collection(db, "documents"),
          where("userId", "==", this.currentUser.uid)
        );
        
        const querySnapshot = await getDocs(q);
        this.userDocuments = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (error) {
        console.error("Error loading documents:", error);
      }
    },
    async createNewDocument() {
      if (!this.currentUser) return;
      
      try {
        const newDocRef = doc(collection(db, "documents"));
        const documentData = {
          userId: this.currentUser.uid,
          title: "Untitled",
          content: "",
          subtitle: this.currentSubtitle,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          mode: this.isLightMode ? "light" : "dark"
        };
        
        await setDoc(newDocRef, documentData);
        this.currentDocumentId = newDocRef.id;
        this.currentTitle = "Untitled";
        if (this.$refs.editableArea) {
          this.$refs.editableArea.innerHTML = "";
        }
        await this.loadUserDocuments();
        this.setupDocumentListener(newDocRef.id);
        
        this.$nextTick(() => {
          if (this.$refs.titleEditable) {
            this.$refs.titleEditable.innerText = "Untitled";
          }
        });
      } catch (error) {
        console.error("Error creating new document:", error);
      }
    },
    async loadDocument(docId) {
      if (!this.currentUser) return;
      
      try {
        const docRef = doc(db, "documents", docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          this.currentDocumentId = docId;
          this.currentTitle = data.title || "Untitled";
          this.currentSubtitle = data.subtitle || this.originalSubtitle;
          this.isLightMode = data.mode === "light";
          
          if (this.$refs.editableArea) {
            this.$refs.editableArea.innerHTML = data.content || "";
          }
          
          this.$nextTick(() => {
            if (this.$refs.subtitleEditable) {
              this.$refs.subtitleEditable.innerHTML = this.formattedSubtitleHtml;
            }
            if (this.$refs.titleEditable) {
              this.$refs.titleEditable.innerText = this.currentTitle;
            }
          });
          
          this.showDocumentList = false;
          this.setupDocumentListener(docId);
          await this.loadUserDocuments();
        }
      } catch (error) {
        console.error("Error loading document:", error);
      }
    },
    setupDocumentListener(docId) {
      if (this.unsubscribeDocument) {
        this.unsubscribeDocument();
      }
      
      const docRef = doc(db, "documents", docId);
      this.unsubscribeDocument = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists() && !this.contentChanged) {
          const data = docSnap.data();
          if (this.$refs.editableArea && data.content !== this.$refs.editableArea.innerHTML) {
            this.$refs.editableArea.innerHTML = data.content || "";
          }
          if (data.title !== this.currentTitle) {
            this.currentTitle = data.title || "Untitled";
            if (this.$refs.titleEditable) {
              this.$refs.titleEditable.innerText = this.currentTitle;
            }
          }
          this.loadUserDocuments(); // Refresh the document list
        }
        this.contentChanged = false;
      });
    },
    async deleteDocument(docId) {
      if (!confirm("Are you sure you want to delete this document?")) return;
      
      try {
        await deleteDoc(doc(db, "documents", docId));
        
        if (this.currentDocumentId === docId) {
          if (this.userDocuments.length > 1) {
            const nextDoc = this.sortedDocuments.find(doc => doc.id !== docId);
            if (nextDoc) {
              await this.loadDocument(nextDoc.id);
            } else {
              await this.createNewDocument();
            }
          } else {
            await this.createNewDocument();
          }
        }
        
        await this.loadUserDocuments();
      } catch (error) {
        console.error("Error deleting document:", error);
      }
    },
    startAutoSave() {
      if (this.autoSaveInterval) clearInterval(this.autoSaveInterval);
      
      this.autoSaveInterval = setInterval(() => {
        if (this.contentChanged) {
          this.saveContent();
        }
      }, 15000);
      
      this.autoSaveStatus = "On";
    },
    stopAutoSave() {
      if (this.autoSaveInterval) {
        clearInterval(this.autoSaveInterval);
        this.autoSaveInterval = null;
      }
      this.autoSaveStatus = "Off";
    },
    handleInput() {
      this.scrollToBottom();
      if (this.saveStateText === 'Saved') {
        this.saveStateText = "Save";
      }
      
      this.contentChanged = true;
      
      if (this.saveTimeout) clearTimeout(this.saveTimeout);
      this.saveTimeout = setTimeout(() => {
        if (this.autoSaveEnabled && this.contentChanged) {
          this.saveContent();
        }
      }, 2000);
    },
    handleContentChange() {
      this.scrollToBottom();
      if (this.saveStateText === 'Saved') {
        this.saveStateText = "Save";
      }
    },
    async saveContent() {
      if (!this.currentUser || !this.currentDocumentId) return;
      
      if (this.saveStateText === 'Saving...') return;
      this.saveStateText = 'Saving...';
      this.contentChanged = false;
      
      try {
        const docRef = doc(db, "documents", this.currentDocumentId);
        await setDoc(docRef, {
          title: this.currentTitle,
          content: this.$refs.editableArea.innerHTML,
          subtitle: this.currentSubtitle,
          updatedAt: serverTimestamp(),
          mode: this.isLightMode ? "light" : "dark"
        }, { merge: true });
        
        this.saveStateText = 'Saved';
        await this.loadUserDocuments();
      } catch (error) {
        console.error("Error saving document:", error);
        this.saveStateText = 'Error';
        setTimeout(() => {
          this.saveStateText = 'Save';
        }, 2000);
      }
    },
    async saveTitle() {
      const newTitle = this.$refs.titleEditable.innerText.trim();
      this.currentTitle = newTitle || "Untitled";
      if (this.currentDocumentId) {
        await this.saveContent();
      }
    },
    blurTitle() {
      this.$refs.titleEditable.blur();
      this.saveTitle();
    },
    async blurSubtitle() {
  const newSubtitle = this.$refs.subtitleEditable.innerText.trim();
  this.currentSubtitle = newSubtitle || "0fReDesign.tech";
  
  // Save the subtitle before updating the HTML
  if (this.currentDocumentId) {
    await this.saveContent();
  }
  
  this.$nextTick(() => {
    if (this.$refs.subtitleEditable) {
      this.$refs.subtitleEditable.innerHTML = this.formattedSubtitleHtml;
    }
  });
}
,
    saveSubtitle() {
      // Handled in blurSubtitle
    },
    checkActiveFormats() {
      if (document.activeElement !== this.$refs.editableArea && 
          document.activeElement !== this.$refs.subtitleEditable) {
        this.activeFormats = {
          bold: false,
          italic: false,
          underline: false,
          unorderedList: false,
          orderedList: false,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
        };
        return;
      }

      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      const underline = document.queryCommandState('underline');
      const unorderedList = this.hasListType('UL');
      const orderedList = this.hasListType('OL');
      const alignLeft = document.queryCommandState('justifyLeft');
      const alignCenter = document.queryCommandState('justifyCenter');
      const alignRight = document.queryCommandState('justifyRight');

      this.activeFormats = {
        bold: bold,
        italic: italic,
        underline: underline,
        unorderedList: unorderedList,
        orderedList: orderedList,
        alignLeft: alignLeft,
        alignCenter: alignCenter,
        alignRight: alignRight,
      };
    },
    hasListType(tagName) {
      const selection = window.getSelection();
      if (!selection.rangeCount) return false;

      const node = selection.getRangeAt(0).startContainer;
      return !!this.findParentTag(node, tagName);
    },
    findParentTag(node, tagName) {
      while (node && node !== this.$refs.editableArea && node !== this.$refs.subtitleEditable) {
        if (node.nodeName === tagName) return node;
        node = node.parentNode;
      }
      return null;
    },
    handleKeyDown(e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        document.execCommand('insertText', false, '\t');
      }
    },
    handleFormatShortcuts(e) {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 'b':
            e.preventDefault();
            this.formatText('bold');
            break;
          case 'i':
            e.preventDefault();
            this.formatText('italic');
            break;
          case 'u':
            e.preventDefault();
            this.formatText('underline');
            break;
        }
      }
    },
    handleTouchStart(e) {
      this.touchStartY = e.touches[0].clientY;
    },
    handleSaveKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        this.saveContent();
      }
    },
    scrollToBottom() {
      this.$nextTick(() => {
        const editableArea = this.$refs.editableArea;
        if (editableArea) {
          editableArea.scrollTop = editableArea.scrollHeight;
        }
      });
    },
    toggleFullscreen() {
      if (!document.fullscreenElement) {
        this.$refs.notepadContainer.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
      } else {
        document.exitFullscreen();
      }
    },
    handleFullscreenChange() {
      this.isFullscreen = !!document.fullscreenElement;
    },
    toggleMode() {
      this.isLightMode = !this.isLightMode;
      if (this.currentDocumentId) {
        this.saveContent();
      }
    },
    formatText(command, value = null) {
      if (document.activeElement !== this.$refs.editableArea) {
        this.$refs.editableArea.focus();
      }
      document.execCommand(command, false, value);
      this.checkActiveFormats();
    },
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = timestamp.toDate();
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Product+Sans:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@400&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  -webkit-tap-highlight-color: transparent;
  -webkit-text-size-adjust: 100%;
}

html, body, #app {
  height: 100%;
  width: 100%;
  overflow: hidden;
  touch-action: manipulation;
}

.app-container {
  width: 100%;
  height: 100%;
  min-height: 100vh;
  background-color: #000;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
  -webkit-overflow-scrolling: touch;
}

.app-container.light-mode {
  background-color: #f5f5f5;
}

.notepad-container {
  background-color: #000;
  color: #fff;
  font-family: 'Product Sans', sans-serif;
  width: 100%;
  height: 100%;
  min-height: 100vh;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden; 
  transition: background-color 0.2s ease, color 0.2s ease;
  padding-bottom: 80px;
  -webkit-overflow-scrolling: touch;
}

.app-container.light-mode .notepad-container {
  background-color: #fff;
  color: #333;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.notepad-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.title-container {
  margin-bottom: 1.5rem;
  width: 100%;
  padding-right: 120px;
}

.title {
  font-size: clamp(2rem, 8vw, 3rem);
  font-weight: 700;
  margin: 0;
  line-height: 1.2;
  outline: none;
  transition: none;
  min-height: 1.2em;
}

.title:focus {
  background-color: rgba(255,255,255,0.1);
  border-radius: 4px;
}

.app-container.light-mode .title:focus {
  background-color: rgba(0,0,0,0.05);
}

.subtitle {
  font-size: clamp(1rem, 4vw, 1.25rem);
  margin: 0.5rem 0 0 0;
  opacity: 1;
  color: rgba(255, 255, 255, 0.6);
  transition: color 0.2s ease;
}

.app-container.light-mode .subtitle {
  color: rgba(0, 0, 0, 0.6);
}

.subtitle span {
  outline: none;
  border-radius: 4px;
  padding: 0 2px;
  transition: none;
  min-height: 1em;
  display: inline-block;
  color: inherit;
}

.mono-zero {
  font-family: Consolas, Inconsolata, monospace;
}

.subtitle span:focus {
  background-color: rgba(255,255,255,0.1);
}

.app-container.light-mode .subtitle span:focus {
  background-color: rgba(0,0,0,0.05);
}

.editable-link {
  background-image: linear-gradient(to right, #4facfe, #a83279, #fc00ff);
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  cursor: pointer;
  text-decoration: none;
}

.subtitle span a {
    display: none;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 1rem 0;
  flex-wrap: wrap;
  gap: 0.5rem;
  width: 100%;
}

.toolbar-left {
  display: flex;
  gap: 0.5rem;
}

.toolbar-right {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
}

.mode-toggle,
.save-state-prompt,
.format-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.5rem 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Product Sans', sans-serif;
  font-size: clamp(0.8rem, 3vw, 0.9rem);
  transition: all 0.2s ease;
  min-height: 36px;
  touch-action: manipulation;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.app-container.light-mode .mode-toggle,
.app-container.light-mode .save-state-prompt,
.app-container.light-mode .format-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.mode-toggle:hover,
.save-state-prompt:hover,
.format-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.app-container.light-mode .mode-toggle:hover,
.app-container.light-mode .save-state-prompt:hover,
.app-container.light-mode .format-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.format-btn {
  min-width: 36px;
  padding: 0.5rem;
}

.format-btn b, .format-btn i, .format-btn u {
  font-weight: normal;
  font-style: normal;
  text-decoration: none;
}

.format-btn.active {
  background: none;
  background-image: linear-gradient(135deg, #4facfe, #a83279, #fc00ff);
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  border-color: rgba(255,255,255,0.5);
  font-weight: bold;
  animation: none;
}

.format-btn.active b,
.format-btn.active i,
.format-btn.active u {
    font-weight: bold;
}

.app-container.light-mode .format-btn.active {
  background: none;
  background-image: linear-gradient(135deg, #4facfe, #a83279, #fc00ff);
  color: transparent;
  -webkit-background-clip: text;
  background-clip: text;
  border-color: rgba(0,0,0,0.5);
  font-weight: bold;
  animation: none;
}

.app-container.light-mode .format-btn.active b,
.app-container.light-mode .format-btn.active i,
.app-container.light-mode .format-btn.active u {
    font-weight: bold;
}

.size-toggle {
  font-size: 1.1em;
  font-weight: bold;
}

.align-left::before {
  content: "≡";
}

.align-center::before {
  content: "⋮";
  letter-spacing: 0.1em;
}

.align-right::before {
  content: "≡";
}

.editable-area {
  outline: none;
  font-family: 'Inter', sans-serif;
  font-size: clamp(1rem, 4vw, 1.1rem);
  line-height: 1.6;
  padding: 0;
  white-space: pre-wrap;
  flex: 1;
  overflow-y: auto; 
  width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
  min-height: 0; 
  max-height: calc(100vh - 250px); 
  color: inherit;
  transition: color 0.2s ease;
  -webkit-user-select: text;
  user-select: text;
  -webkit-touch-callout: default;
}

.editable-area::-webkit-scrollbar {
  display: none;
}
.editable-area {
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.editable-area:empty::before {
  content: "Type here...";
  color: rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.app-container.light-mode .editable-area:empty::before {
  color: rgba(0, 0, 0, 0.3);
}

.editable-area:empty:focus::before {
  content: "";
}

.editable-area:focus-visible {
  outline: none;
}

.control-buttons {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  display: flex;
  gap: 0.5rem;
  z-index: 100;
}

.fullscreen-toggle {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.75rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-family: 'Product Sans', sans-serif;
  backdrop-filter: blur(5px);
  font-size: clamp(0.8rem, 3vw, 0.9rem);
  white-space: nowrap;
  transition: background-color 0.2s ease;
  min-height: 44px;
  touch-action: manipulation;
}

.app-container.light-mode .fullscreen-toggle {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.3);
}

.fullscreen-toggle:hover {
  background: rgba(255, 255, 255, 0.2);
}

.app-container.light-mode .fullscreen-toggle:hover {
  background: rgba(0, 0, 0, 0.2);
}

.user-controls {
  position: fixed;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.7);
  padding: 8px 12px;
  border-radius: 8px;
  backdrop-filter: blur(5px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  font-family: 'Product Sans', sans-serif;
}

.user-email-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: default;
  font-size: 0.85rem;
  font-family: 'Product Sans', sans-serif;
  transition: all 0.2s ease;
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-email {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.logout-btn, 
.documents-btn, 
.new-doc-btn {
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  font-family: 'Product Sans', sans-serif;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.logout-btn:hover, 
.documents-btn:hover, 
.new-doc-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Document list styles */
.document-list {
  position: fixed;
  top: 60px;
  right: 20px;
  background: rgba(20, 20, 20, 0.95);
  border-radius: 10px;
  padding: 12px;
  max-height: 60vh;
  overflow-y: auto;
  z-index: 999;
  width: 320px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  font-family: 'Product Sans', sans-serif;
}

.document-list.light-mode {
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.15);
}

.document-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  margin: 6px 0;
  border-radius: 6px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  border: 1px solid transparent;
  font-family: 'Product Sans', sans-serif;
}

.document-list.light-mode .document-item {
  background: rgba(0, 0, 0, 0.05);
  color: #333;
}

.document-item:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.2);
}

.document-list.light-mode .document-item:hover {
  background: rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.2);
}

.document-item.active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.document-list.light-mode .document-item.active {
  background: rgba(0, 0, 0, 0.15);
  border-color: rgba(0, 0, 0, 0.3);
}

.doc-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
}

.document-list.light-mode .doc-title {
  color: rgba(0, 0, 0, 0.9);
}

.doc-date {
  font-size: 0.75rem;
  opacity: 0.8;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.7);
}

.document-list.light-mode .doc-date {
  color: rgba(0, 0, 0, 0.7);
}

.delete-doc-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  margin-left: 10px;
  font-size: 1.2rem;
  line-height: 1;
  transition: color 0.2s ease;
  padding: 0 4px;
  font-family: 'Product Sans', sans-serif;
}

.document-list.light-mode .delete-doc-btn {
  color: rgba(0, 0, 0, 0.6);
}

.delete-doc-btn:hover {
  color: rgba(255, 100, 100, 0.9);
}

.document-list.light-mode .delete-doc-btn:hover {
  color: rgba(200, 0, 0, 0.9);
}

/* Light mode adjustments for user controls */
.app-container.light-mode .user-controls {
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.app-container.light-mode .user-email-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.app-container.light-mode .logout-btn,
.app-container.light-mode .documents-btn,
.app-container.light-mode .new-doc-btn {
  background: rgba(0, 0, 0, 0.1);
  color: #333;
  border: 1px solid rgba(0, 0, 0, 0.2);
}

.app-container.light-mode .logout-btn:hover,
.app-container.light-mode .documents-btn:hover,
.app-container.light-mode .new-doc-btn:hover {
  background: rgba(0, 0, 0, 0.2);
}

.auto-save-indicator {
  font-size: 0.8rem;
  margin-left: 10px;
  opacity: 0.7;
}

/* Responsive styles */
@media (max-width: 768px) {
  .notepad-container {
    padding: 1.25rem;
    padding-bottom: 100px;
  }

  .title-container {
    margin-bottom: 1.5rem;
    padding-right: 0;
  }

  .toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .toolbar-left {
    width: 100%;
  }

  .toolbar-right {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 5px;
    -webkit-overflow-scrolling: touch;
  }

  .control-buttons {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    top: auto;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .fullscreen-toggle {
    position: static;
  }

  .document-list {
    width: calc(100% - 40px);
    left: 20px;
    right: 20px;
    max-height: 50vh;
  }
}

@media (max-width: 480px) {
  .notepad-container {
    padding: 1rem;
    padding-bottom: 120px;
  }

  .title-container {
    margin-bottom: 1rem;
  }

  .title {
    font-size: clamp(1.5rem, 8vw, 2.5rem);
  }

  .subtitle {
    font-size: clamp(0.9rem, 4vw, 1.1rem);
  }

  .control-buttons {
    bottom: 0.5rem;
    right: 0.5rem;
    gap: 0.5rem;
  }

  .fullscreen-toggle {
    padding: 0.6rem 0.8rem;
    font-size: 0.8rem;
  }

  .user-controls {
    flex-wrap: wrap;
    justify-content: flex-end;
    padding: 6px;
    gap: 6px;
  }

  .user-email {
    display: none;
  }

  .logout-btn,
  .documents-btn,
  .new-doc-btn {
    padding: 4px 8px;
    font-size: 0.7rem;
  }
}

/* Very small devices (e.g., iPhone 5/SE) */
@media (max-width: 320px) {
  .notepad-container {
    padding: 0.75rem;
    padding-bottom: 100px;
  }

  .title {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9rem;
  }

  .control-buttons {
    bottom: 0.5rem;
    right: 0.5rem;
  }

  .fullscreen-toggle {
    padding: 0.5rem 0.7rem;
    font-size: 0.75rem;
  }

  .format-btn {
    min-width: 32px;
    padding: 0.4rem;
    font-size: 0.7rem;
  }

  .user-controls {
    top: 5px;
    right: 5px;
  }
}

/* Landscape orientation */
@media (max-height: 480px) and (orientation: landscape) {
  .notepad-container {
    padding-bottom: 80px;
  }

  .title-container {
    margin-bottom: 0.5rem;
  }

  .editable-area {
    min-height: 40vh;
  }

  .control-buttons {
    flex-direction: row;
    bottom: 0.5rem;
    right: 0.5rem;
    top: auto;
  }

  .toolbar {
    flex-direction: row;
    align-items: center;
  }

  .toolbar-right {
    flex-wrap: nowrap;
  }

  .document-list {
    max-height: 40vh;
  }
}

/* Animation for save state */
@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

.save-state-prompt.saving {
  animation: pulse 1s infinite;
}

/* Special styles for iOS devices */
@supports (-webkit-touch-callout: none) {
  .editable-area {
    padding-bottom: 20px;
  }
}

/* Print styles */
@media print {
  .app-container {
    background-color: white !important;
  }
  
  .notepad-container {
    background-color: white !important;
    color: black !important;
    padding: 0 !important;
  }
  
  .toolbar, .control-buttons, .user-controls {
    display: none !important;
  }
  
  .editable-area {
    color: black !important;
    min-height: auto !important;
    height: auto !important;
  }
  
  .title, .subtitle {
    color: black !important;
  }
}
</style>