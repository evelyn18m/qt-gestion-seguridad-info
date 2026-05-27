<script setup lang="ts">
const tipo = 'probabilidades'
const titulo = 'Probabilidad'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
