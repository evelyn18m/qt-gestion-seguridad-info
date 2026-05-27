<script setup lang="ts">
const tipo = 'tipos-control'
const titulo = 'Tipos de Control'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
