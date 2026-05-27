<script setup lang="ts">
const tipo = 'impactos'
const titulo = 'Impactos'
const campos = ['tipo', 'nivel', 'valor', 'criterio']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
