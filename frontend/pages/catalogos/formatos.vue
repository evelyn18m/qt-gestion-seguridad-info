<script setup lang="ts">
const tipo = 'formatos'
const titulo = 'Formatos'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
