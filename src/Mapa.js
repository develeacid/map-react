import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import { Map, View } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { useGeographic } from "ol/proj";
import { Style, Stroke, Fill } from "ol/style";
import * as turf from "@turf/turf";
import datos from "./denue_inegi_20_.json";

function Mapa() {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [vectorSource, setVectorSource] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [puntosEnCuadro, setPuntosEnCuadro] = useState([]);

  useGeographic();

  useEffect(() => {
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    // Definición de los cuadros (polígonos cerrados)
    const bounds1 = [
      [-96.8, 17.0],
      [-96.8, 17.2],
      [-96.5, 17.2],
      [-96.5, 17.0],
      [-96.8, 17.0], // Se cierra el polígono
    ];

    const bounds2 = [
      [-96.45, 17.0],
      [-96.45, 17.2],
      [-96.2, 17.2],
      [-96.2, 17.0],
      [-96.45, 17.0], // Se cierra el polígono
    ];

    const bounds3 = [
      [-96.6, 17.3],
      [-96.6, 17.5],
      [-96.4, 17.5],
      [-96.4, 17.3],
      [-96.6, 17.3], // Se cierra el polígono
    ];

    // Crear los polígonos
    const rectanglePolygons = [
      turf.polygon([bounds1]),
      turf.polygon([bounds2]),
      turf.polygon([bounds3]),
    ];

    setRectangles(rectanglePolygons);

    // Agregar los polígonos a un nuevo VectorSource
    const rectangleSource = new VectorSource({
      features: rectanglePolygons.map((polygon, index) => {
        const styles = [
          new Style({
            fill: new Fill({
              color: 'rgba(255, 0, 0, 0.5)', // Rojo
            }),
            stroke: new Stroke({
              color: '#000',
              width: 2,
            }),
          }),
          new Style({
            fill: new Fill({
              color: 'rgba(0, 255, 0, 0.5)', // Verde
            }),
            stroke: new Stroke({
              color: '#000',
              width: 2,
            }),
          }),
          new Style({
            fill: new Fill({
              color: 'rgba(0, 0, 255, 0.5)', // Azul
            }),
            stroke: new Stroke({
              color: '#000',
              width: 2,
            }),
          }),
        ];

        const feature = new GeoJSON().readFeature(polygon);
        feature.setStyle(styles[index]);
        return feature;
      }),
    });

    const rectangleLayer = new VectorLayer({
      source: rectangleSource,
    });

    const initialMap = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new OSM(),
        }),
        vectorLayer,
        rectangleLayer,
      ],
      view: new View({
        center: [-96.769722, 17.066167],
        zoom: 9,
      }),
    });

    setMap(initialMap);
    setVectorSource(initialVectorSource);

    return () => {
      initialMap.setTarget(null);
      initialMap.getLayers().clear();
      initialMap.dispose();
    };
  }, []);

  const buscarPuntosEnCuadro = (rectangle) => {
    if (!map || !vectorSource || !rectangle) return;

    const puntosEnCuadro = vectorSource.getFeatures().filter((feature) => {
      const coords = feature.getGeometry().getCoordinates();
      if (!coords || coords.length === 0) {
        console.warn("Coordenadas del punto no válidas:", coords);
        return false;
      }

      const point = turf.point(coords);
      const polygon = rectangle.geometry; // Asegúrate de que el polígono está definido
      if (!polygon) {
        console.warn("Polígono no definido para el rectángulo:", rectangle);
        return false;
      }

      return turf.booleanPointInPolygon(point, polygon);
    });

    setPuntosEnCuadro(puntosEnCuadro);

    // Calcular la extensión del polígono y añadir un margen
    const extent = turf.bbox(rectangle);
    const margen = 0.01; // Ajusta este valor para el margen que desees
    const extendedExtent = [
      extent[0] - margen, // minX
      extent[1] - margen, // minY
      extent[2] + margen, // maxX
      extent[3] + margen, // maxY
    ];

    // Centrar el mapa en el nuevo rango
    map.getView().fit(extendedExtent, {
      duration: 1000, // Animación de 1 segundo
      maxZoom: 12, // Ajusta el zoom máximo como desees
    });
  };

  return (
    <div>
      {rectangles.map((rectangle, index) => (
        <button
          key={index}
          onClick={() => buscarPuntosEnCuadro(rectangle)}
        >
          Buscar puntos en {index === 0 ? "Rojo" : index === 1 ? "Verde" : "Azul"}
        </button>
      ))}

      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      <div style={{ marginTop: "20px" }}>
        <h3>Total de puntos en el cuadro: {puntosEnCuadro.length}</h3>
        <ul>
          {puntosEnCuadro.map((feature, index) => {
            const propiedades = feature.getProperties();
            console.log("Propiedades del punto:", propiedades);

            return (
              <li key={index}>
                {propiedades.nom_estab || "Sin nombre"} -{" "}
                {propiedades.nombre_act || "Actividad desconocida"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default Mapa;
