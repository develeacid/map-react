import React, { useEffect, useRef, useState } from "react";
import "ol/ol.css"; // Importa los estilos de OpenLayers
import { Map, View } from "ol"; // Importa las clases Map y View de OpenLayers
import TileLayer from "ol/layer/Tile"; // Importa la clase TileLayer para capas de teselas
import OSM from "ol/source/OSM"; // Importa la fuente de teselas OpenStreetMap
import VectorLayer from "ol/layer/Vector"; // Importa la clase VectorLayer para capas vectoriales
import VectorSource from "ol/source/Vector"; // Importa la clase VectorSource para fuentes vectoriales
import GeoJSON from "ol/format/GeoJSON"; // Importa el formato GeoJSON para leer datos GeoJSON
import { useGeographic } from "ol/proj"; // Importa la función useGeographic para usar coordenadas geográficas
import { Style, Stroke, Fill } from "ol/style"; // Importa clases de estilo para las características del mapa
import * as turf from "@turf/turf"; // Importa la biblioteca Turf.js para operaciones geoespaciales
import datos from "./denue_inegi_20_.json"; // Importa los datos GeoJSON desde un archivo local

function Mapa() {
  const mapRef = useRef(); // Referencia al elemento del mapa
  const [map, setMap] = useState(null); // Estado para almacenar la instancia del mapa
  const [vectorSource, setVectorSource] = useState(null); // Estado para almacenar la fuente vectorial
  const [rectangles, setRectangles] = useState([]); // Estado para almacenar los cuadros (polígonos)
  const [puntosEnCuadro, setPuntosEnCuadro] = useState([]); // Estado para almacenar los puntos dentro de un cuadro

  useGeographic(); // Indica a OpenLayers que se utilizarán coordenadas geográficas

  useEffect(() => {
    // Este useEffect se ejecuta solo una vez al montar el componente

    // Crea una fuente vectorial con los datos GeoJSON importados
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos),
    });

    // Crea una capa vectorial con la fuente vectorial creada
    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    // Define las coordenadas de los cuadros (polígonos cerrados)
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

    // Crea los polígonos utilizando Turf.js
    const rectanglePolygons = [
      turf.polygon([bounds1]),
      turf.polygon([bounds2]),
      turf.polygon([bounds3]),
    ];

    setRectangles(rectanglePolygons); // Guarda los polígonos en el estado

    // Crea una fuente vectorial para los rectángulos
    const rectangleSource = new VectorSource({
      features: rectanglePolygons.map((polygon, index) => {
        // Define estilos para cada rectángulo (rojo, verde, azul)
        const styles = [
          new Style({
            fill: new Fill({
              color: "rgba(255, 0, 0, 0.5)", // Rojo
            }),
            stroke: new Stroke({
              color: "#000",
              width: 2,
            }),
          }),
          new Style({
            fill: new Fill({
              color: "rgba(0, 255, 0, 0.5)", // Verde
            }),
            stroke: new Stroke({
              color: "#000",
              width: 2,
            }),
          }),
          new Style({
            fill: new Fill({
              color: "rgba(0, 0, 255, 0.5)", // Azul
            }),
            stroke: new Stroke({
              color: "#000",
              width: 2,
            }),
          }),
        ];

        // Convierte el polígono de Turf.js a una característica de OpenLayers
        const feature = new GeoJSON().readFeature(polygon);
        feature.setStyle(styles[index]); // Asigna el estilo correspondiente
        return feature;
      }),
    });

    // Crea una capa vectorial para los rectángulos
    const rectangleLayer = new VectorLayer({
      source: rectangleSource,
    });

    // Crea una instancia del mapa de OpenLayers
    const initialMap = new Map({
      target: mapRef.current, // Elemento donde se renderizará el mapa
      layers: [
        new TileLayer({
          source: new OSM(), // Capa base de OpenStreetMap
        }),
        vectorLayer, // Capa vectorial con los datos GeoJSON
        rectangleLayer, // Capa vectorial con los rectángulos
      ],
      view: new View({
        center: [-96.769722, 17.066167], // Coordenadas del centro inicial
        zoom: 9, // Nivel de zoom inicial
      }),
    });

    setMap(initialMap); // Guarda la instancia del mapa en el estado
    setVectorSource(initialVectorSource); // Guarda la fuente vectorial en el estado

    // Función de limpieza que se ejecuta al desmontar el componente
    return () => {
      initialMap.setTarget(null); // Elimina el mapa del elemento
      initialMap.getLayers().clear(); // Limpia las capas del mapa
      initialMap.dispose(); // Libera recursos del mapa
    };
  }, []); // El array vacío indica que este useEffect se ejecuta solo una vez

  // Función para buscar puntos dentro de un rectángulo
  const buscarPuntosEnCuadro = (rectangle) => {
    if (!map || !vectorSource || !rectangle) return; // Verifica si las variables están definidas

    // Filtra las características de la fuente vectorial que están dentro del rectángulo
    const puntosEnCuadro = vectorSource.getFeatures().filter((feature) => {
      const coords = feature.getGeometry().getCoordinates();
      if (!coords || coords.length === 0) {
        console.warn("Coordenadas del punto no válidas:", coords);
        return false;
      }

      // Crea un punto con Turf.js utilizando las coordenadas de la característica
      const point = turf.point(coords);
      const polygon = rectangle.geometry; // Obtiene la geometría del rectángulo
      if (!polygon) {
        console.warn("Polígono no definido para el rectángulo:", rectangle);
        return false;
      }

      // Utiliza Turf.js para verificar si el punto está dentro del polígono
      return turf.booleanPointInPolygon(point, polygon);
    });

    setPuntosEnCuadro(puntosEnCuadro); // Guarda los puntos encontrados en el estado
  };

  return (
    <div>
      {/* Renderiza botones para cada rectángulo */}
      {rectangles.map((rectangle, index) => (
        <button key={index} onClick={() => buscarPuntosEnCuadro(rectangle)}>
          Buscar puntos en{" "}
          {index === 0 ? "Rojo" : index === 1 ? "Verde" : "Azul"}
        </button>
      ))}

      {/* Elemento donde se renderizará el mapa */}
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      {/* Muestra la cantidad de puntos encontrados y sus propiedades */}
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
