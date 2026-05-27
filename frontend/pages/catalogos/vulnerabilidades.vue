<script setup lang="ts">
const tipo = 'vulnerabilidades'
const titulo = 'Vulnerabilidades'
const campos = ['categoria', 'descripcion']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
