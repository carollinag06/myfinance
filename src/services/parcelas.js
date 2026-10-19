function adicionarMeses(dataISO, quantidade) {
  const [ano, mes, dia] = dataISO.split('-').map(Number);
  const indiceMes = mes - 1 + quantidade;
  const anoDestino = ano + Math.floor(indiceMes / 12);
  const mesDestino = ((indiceMes % 12) + 12) % 12;
  const ultimoDia = new Date(Date.UTC(anoDestino, mesDestino + 1, 0)).getUTCDate();
  return [anoDestino, String(mesDestino + 1).padStart(2, '0'), String(Math.min(dia, ultimoDia)).padStart(2, '0')].join('-');
}

module.exports = { adicionarMeses };
