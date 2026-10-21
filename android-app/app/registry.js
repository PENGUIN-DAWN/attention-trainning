'use strict';
const modules = JSON.parse(document.getElementById('trainingData').textContent);
const presentation = JSON.parse(document.getElementById('trainingPresentation').textContent);
const $ = id => document.getElementById(id);
/** @typedef {{id:number,key:string,engine:string,title:string,rule:string,settings:Object,example:Object}} TrainingDescriptor */
const trainingRegistry = JSON.parse(document.getElementById('trainingRegistry').textContent);
const trainingsById = new Map(trainingRegistry.map(item => [item.id, item]));
const modulesById = new Map(modules.map(item => [item.id, item]));

function hasTraining(id) {
  return Number.isInteger(id) && trainingsById.has(id);
}

function engineFor(id) {
  return trainingsById.get(id)?.engine;
}
