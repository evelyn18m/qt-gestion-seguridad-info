<script setup lang="ts">
const tipo = 'areas'
const titulo = '&Aacute;reas'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
