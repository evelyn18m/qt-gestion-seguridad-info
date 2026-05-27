<script setup lang="ts">
const tipo = 'riesgos'
const titulo = 'Riesgos'
const campos = ['evaluacion', 'valor']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
