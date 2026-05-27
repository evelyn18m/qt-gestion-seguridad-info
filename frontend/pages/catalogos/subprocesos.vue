<script setup lang="ts">
const tipo = 'subprocesos'
const titulo = 'Subprocesos'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
