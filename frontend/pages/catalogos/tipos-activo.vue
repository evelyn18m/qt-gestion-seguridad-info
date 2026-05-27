<script setup lang="ts">
const tipo = 'tipos-activo'
const titulo = 'Tipos de Activo'
const campos = ['nombre', 'detalle']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
