import * as XLSX from "xlsx";

export function exportarExcel({ registros, consultores, clientes, proyectos, pivot, month }) {
  const proyectoById = Object.fromEntries(proyectos.map((p) => [p.id, p]));
  const clienteById = Object.fromEntries(clientes.map((c) => [c.id, c]));
  const consultorById = Object.fromEntries(consultores.map((c) => [c.id, c]));

  const detailRows = registros.map((r) => {
    const proyecto = proyectoById[r.proyecto_id];
    const cliente = clienteById[proyecto?.cliente_id];
    const consultor = consultorById[r.consultor_id];
    const tarifa = Number(consultor?.tarifa_hora || 0);
    return {
      Fecha: r.fecha,
      Consultor: consultor?.nombre || "",
      Cliente: cliente?.nombre || "",
      Proyecto: proyecto?.nombre || "",
      Horas: Number(r.horas),
      "Tarifa/hora": tarifa,
      Monto: Math.round(Number(r.horas) * tarifa * 100) / 100,
      Descripcion: r.descripcion || "",
    };
  });

  const summaryRows = consultores.map((c) => {
    const row = { Consultor: c.nombre };
    let total = 0;
    clientes.forEach((cl) => {
      const v = pivot[c.id]?.[cl.id] || 0;
      row[cl.nombre] = v;
      total += v;
    });
    row["Total horas"] = Math.round(total * 100) / 100;
    row["Tarifa/hora"] = Number(c.tarifa_hora || 0);
    row["Monto total"] = Math.round(total * Number(c.tarifa_hora || 0) * 100) / 100;
    return row;
  });

  const wb = XLSX.utils.book_new();
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  const wsDetail = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle");
  XLSX.writeFile(wb, `horas_${month}.xlsx`);
}
