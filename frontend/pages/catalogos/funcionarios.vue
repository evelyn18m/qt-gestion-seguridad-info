<script setup lang="ts">
const tipo = 'funcionarios'
const titulo = 'Funcionarios'
const campos = ['nombre']
</script>

<template>
  <CatalogoManager :tipo="tipo" :titulo="titulo" :campos="campos" />
</template>
