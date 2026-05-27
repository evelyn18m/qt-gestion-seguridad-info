<script setup lang="ts">
const tipo = 'amenazas'
const titulo = 'Amenazas'
const campos = ['categoria', 'nombre', 'tipoFuente']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
