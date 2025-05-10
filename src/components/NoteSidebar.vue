<template>
  <div class="note-sidebar"> <h2>Your Notes</h2>
    <button @click="createNewNote">New Note</button>
    <ul>
      <li
        v-for="note in notes"
        :key="note.id"
        @click="selectNote(note.id)"
        :class="{ 'active': note.id === activeNoteId }"
      >
        {{ note.title || 'Untitled Note' }}
      </li>
    </ul>
    </div>
</template>

<script>
export default {
  name: 'NoteSidebar', // Updated component name
  props: {
    notes: {
      type: Array,
      default: () => []
    },
    activeNoteId: {
      type: String,
      default: null
    }
  },
  methods: {
    createNewNote() {
      // Emit an event to the parent (App.vue) to handle creating a new note
      this.$emit('create-new-note');
    },
    selectNote(noteId) {
      // Emit an event to the parent (App.vue) to handle loading the selected note
      this.$emit('select-note', noteId);
    }
  }
}
</script>

<style scoped>
/* Styling for the sidebar - Matches the style in App.vue's placeholder */
.note-sidebar {
  width: 250px;
  background-color: #1a1a1a;
  color: #fff;
  padding: 1rem;
  overflow-y: auto;
  flex-shrink: 0;
  display: flex; /* Use flex to arrange content */
  flex-direction: column; /* Stack items vertically */
}

.note-sidebar h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #4facfe;
    font-size: 1.2rem;
}

.note-sidebar button {
    display: block;
    width: 100%;
    padding: 0.8rem;
    margin-bottom: 1rem;
    background-color: #43e97b;
    color: #000;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Product Sans', sans-serif;
    font-size: 1rem;
    transition: opacity 0.2s ease;
    font-weight: bold;
}

.note-sidebar button:hover {
    opacity: 0.9;
}

.note-sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
    flex-grow: 1; /* Allow the list to take up available space */
}

.note-sidebar li {
    padding: 0.75rem 0.5rem;
    cursor: pointer;
    border-bottom: 1px solid #3a3a3a;
    transition: background-color 0.2s ease;
    font-size: 1rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.note-sidebar li:last-child {
    border-bottom: none;
}

.note-sidebar li:hover {
    background-color: #3a3a3a;
}

.note-sidebar li.active {
    background-color: #3a3a3a;
    font-weight: bold;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .note-sidebar { /* Updated class name */
        width: 100%;
        height: auto;
        max-height: 150px;
        overflow-y: auto;
        border-bottom: 1px solid #3a3a3a;
        flex-direction: row;
        align-items: center;
        gap: 1rem;
        padding: 0.5rem 1rem;
    }

     .note-sidebar h2 { /* Updated class name */
        margin-bottom: 0;
        flex-shrink: 0;
     }

    .note-sidebar button { /* Updated class name */
        width: auto;
        margin-bottom: 0;
        padding: 0.5rem 1rem;
        flex-shrink: 0;
    }

    .note-sidebar ul { /* Updated class name */
        flex-direction: row;
        overflow-x: auto;
        flex-grow: 1;
        white-space: nowrap;
        padding-bottom: 5px;
        -webkit-overflow-scrolling: touch;
    }

    .note-sidebar li { /* Updated class name */
        border-bottom: none;
        border-right: 1px solid #3a3a3a;
        flex-shrink: 0;
    }

    .note-sidebar li:last-child { /* Updated class name */
        border-right: none;
    }
}
</style>
