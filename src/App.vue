<template>
  <BlackNotepad />
</template>

<script>
import BlackNotepad from './components/BlackNotepad.vue';

export default {
  name: 'App',
  components: {
    BlackNotepad,
  }
}
</script>

<style>
html, body {
  height: 100%;
  width: 100%;
  overflow: hidden; /* Prevent body scroll */
  /* Moved background-color to .app-container */
  margin: 0; /* Explicitly remove margin */
  padding: 0; /* Explicitly remove padding */
}
</style>
