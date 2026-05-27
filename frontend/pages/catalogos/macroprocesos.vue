<script setup lang="ts">
const tipo = 'macroprocesos'
const titulo = 'Macroprocesos'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
