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
  const [rectangle, setRectangle] = useState(null);
  const [puntosEnCuadro, setPuntosEnCuadro] = useState([]);

  useGeographic();

  useEffect(() => {
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    const bounds = [
      [-96.8, 17.0],
      [-96.8, 17.2],
      [-96.5, 17.2],
      [-96.5, 17.0],
      [-96.8, 17.0],
    ];
    const rectanglePolygon = turf.polygon([bounds]);
    setRectangle(rectanglePolygon);

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

  const buscarPuntosEnCuadro = () => {
    if (!map || !vectorSource || !rectangle) return;

    const puntosEnCuadro = vectorSource.getFeatures().filter((feature) => {
      const point = turf.point(feature.getGeometry().getCoordinates());
      return turf.booleanPointInPolygon(point, rectangle);
    });

    setPuntosEnCuadro(puntosEnCuadro);
  };

  return (
    <div>
      <button onClick={buscarPuntosEnCuadro}>Buscar puntos en el cuadro</button>

      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      <div style={{ marginTop: "20px" }}>
        <h3>Total de puntos en el cuadro: {puntosEnCuadro.length}</h3>
        <ul>
          {puntosEnCuadro.map((feature, index) => {
            const propiedades = feature.getProperties(); // Obtén las propiedades directamente
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
