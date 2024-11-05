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

    const bounds1 = [
      [-96.8, 17.0],
      [-96.8, 17.2],
      [-96.5, 17.2],
      [-96.5, 17.0],
      [-96.8, 17.0], // Cerramos el polígono
    ];
    
    const bounds2 = [
      [ // Primer polígono en el multipolígono
        [-96.75, 17.05],
        [-96.75, 17.10],
        [-96.70, 17.10],
        [-96.70, 17.05],
        [-96.75, 17.05], // Cerramos el primer polígono
      ],
      [ // Segundo polígono en el multipolígono
        [-96.68, 17.12],
        [-96.68, 17.15],
        [-96.65, 17.15],
        [-96.65, 17.12],
        [-96.68, 17.12], // Cerramos el segundo polígono
      ]
    ];
    
    const bounds3 = [
      [-96.7, 17.1],
      [-96.7, 17.25],
      [-96.55, 17.25],
      [-96.55, 17.1],
      [-96.7, 17.1], // Cerramos el polígono
    ];
    
    // Creación de los polígonos (notar el uso de multiPolygon para bounds2)
    const rectanglePolygons = [
      turf.polygon([bounds1]),
      turf.multiPolygon([bounds2]), // Aquí creamos el multipolígono
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
      const polygon = rectangle.geometry;
  
      if (!polygon) {
        console.warn("Polígono no definido para el rectángulo:", rectangle);
        return false;
      }
  
      // Si es multipolígono, verificamos cada polígono interno
      if (polygon.type === "MultiPolygon") {
        return polygon.coordinates.some((subPolygon) => {
          const individualPolygon = turf.polygon(subPolygon);
          return turf.booleanPointInPolygon(point, individualPolygon);
        });
      }
  
      // Si no es multipolígono, verificamos directamente
      return turf.booleanPointInPolygon(point, polygon);
    });
  
    setPuntosEnCuadro(puntosEnCuadro);
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
