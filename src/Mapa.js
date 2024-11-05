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
  const [rectangleLayer, setRectangleLayer] = useState(null);
  const [rectangles, setRectangles] = useState([]);
  const [puntosEnCuadro, setPuntosEnCuadro] = useState([]);
  const [selectedRectangle, setSelectedRectangle] = useState("");

  useGeographic();

  useEffect(() => {
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    // Definimos los bounds para cada rectángulo con nombres y colores
    const rectanglePolygons = [
      { 
        // Convierte el primer rectángulo en un MultiPolygon
        geometry: turf.multiPolygon([
          [[
            [-96.8, 17.0],
            [-96.8, 17.1],
            [-96.7, 17.1],
            [-96.7, 17.0],
            [-96.8, 17.0],
          ]],
          [[
            [-96.65, 17.0],
            [-96.65, 17.1],
            [-96.55, 17.1],
            [-96.55, 17.0],
            [-96.65, 17.0],
          ]]
        ]),
        color: "rgba(255, 0, 0, 0.3)", 
        name: "Rojo (MultiPolygon)"
      },
      { 
        geometry: turf.polygon([[
          [-96.75, 17.05],
          [-96.75, 17.15],
          [-96.45, 17.15],
          [-96.45, 17.05],
          [-96.75, 17.05],
        ]]), 
        color: "rgba(0, 255, 0, 0.3)", 
        name: "Verde"
      },
      { 
        geometry: turf.polygon([[
          [-96.7, 17.1],
          [-96.7, 17.25],
          [-96.55, 17.25],
          [-96.55, 17.1],
          [-96.7, 17.1],
        ]]), 
        color: "rgba(0, 0, 255, 0.3)", 
        name: "Azul"
      },
    ];

    setRectangles(rectanglePolygons);

    const rectangleSource = new VectorSource({
      features: rectanglePolygons.map((rect) => {
        const feature = new GeoJSON().readFeature(rect.geometry, {
          featureProjection: "EPSG:4326",
        });
        feature.setStyle(
          new Style({
            fill: new Fill({
              color: rect.color,
            }),
            stroke: new Stroke({
              color: "#333",
              width: 2,
            }),
          })
        );
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
    setRectangleLayer(rectangleLayer);

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

      if (polygon.type === "MultiPolygon") {
        return polygon.coordinates.some((subPolygon) => {
          const individualPolygon = turf.polygon(subPolygon);
          return turf.booleanPointInPolygon(point, individualPolygon);
        });
      }

      return turf.booleanPointInPolygon(point, polygon);
    });

    setPuntosEnCuadro(puntosEnCuadro);

    const buffered = turf.buffer(rectangle.geometry, 0.01, { units: "kilometers" });
    const [minX, minY, maxX, maxY] = turf.bbox(buffered);

    map.getView().fit([minX, minY, maxX, maxY], {
      padding: [20, 20, 20, 20],
      duration: 1000,
    });
  };

  const handleRectangleChange = (event) => {
    const selectedIndex = event.target.value;
    if (selectedIndex === "") {
      setSelectedRectangle("");
      setPuntosEnCuadro([]);
      return;
    }
    
    const selectedRectangle = rectangles[selectedIndex];
    setSelectedRectangle(selectedIndex);
    buscarPuntosEnCuadro(selectedRectangle);
  };

  return (
    <div>
      <select onChange={handleRectangleChange} value={selectedRectangle}>
        <option value="">Selecciona un cuadro</option>
        {rectangles.map((rectangle, index) => (
          <option key={index} value={index}>
            {rectangle.name}
          </option>
        ))}
      </select>

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
