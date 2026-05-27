<script setup lang="ts">
const tipo = 'valoraciones'
const titulo = 'Valoraciones'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
