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
import * as turf from "@turf/turf"; // Importa Turf.js para operaciones geoespaciales
import datos from "./denue_inegi_20_.json";

function Mapa() {
  const mapRef = useRef();
  const [map, setMap] = useState(null);
  const [vectorSource, setVectorSource] = useState(null);
  const [rectangle, setRectangle] = useState(null); // Definir el cuadro como estado

  useGeographic();

  useEffect(() => {
    // Capa de puntos de unidades económicas
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    // Crear un cuadro de prueba (polígono rectangular)
    const bounds = [
      [-96.8, 17.0], // Esquina inferior izquierda
      [-96.8, 17.2], // Esquina superior izquierda
      [-96.5, 17.2], // Esquina superior derecha
      [-96.5, 17.0], // Esquina inferior derecha
      [-96.8, 17.0], // Volver a la esquina inferior izquierda para cerrar el polígono
    ];
    const rectanglePolygon = turf.polygon([bounds]);
    setRectangle(rectanglePolygon); // Guardar el polígono en el estado

    const polygonFeature = new GeoJSON().readFeature(rectanglePolygon, {
      dataProjection: "EPSG:4326",
      featureProjection: "EPSG:4326",
    });

    const rectangleSource = new VectorSource({
      features: [polygonFeature],
    });

    const rectangleLayer = new VectorLayer({
      source: rectangleSource,
      style: new Style({
        stroke: new Stroke({
          color: "blue",
          width: 2,
        }),
        fill: new Fill({
          color: "rgba(0, 0, 255, 0.1)",
        }),
      }),
    });

    // Inicializar el mapa
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
        center: [-96.769722, 17.066167], // Centro en Oaxaca
        zoom: 9,
      }),
    });

    setMap(initialMap);
    setVectorSource(initialVectorSource);

    // Limpieza al desmontar
    return () => {
      initialMap.setTarget(null);
      initialMap.getLayers().clear();
      initialMap.dispose();
    };
  }, []);

  // Función para buscar puntos dentro del cuadro
  const buscarPuntosEnCuadro = () => {
    if (!map || !vectorSource || !rectangle) return;

    const puntosEnCuadro = vectorSource.getFeatures().filter((feature) => {
      const point = turf.point(feature.getGeometry().getCoordinates());
      return turf.booleanPointInPolygon(point, rectangle);
    });

    // Mostrar solo los puntos dentro del cuadro
    vectorSource.clear();
    vectorSource.addFeatures(puntosEnCuadro);
  };

  return (
    <div>
      <button onClick={buscarPuntosEnCuadro}>Buscar puntos en el cuadro</button>
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />
    </div>
  );
}

export default Mapa;
