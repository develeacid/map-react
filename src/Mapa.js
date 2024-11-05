// Importamos las librerías necesarias para el componente Mapa
import React, { useEffect, useRef, useState } from "react"; // Importa funciones de React
import "ol/ol.css"; // Importa estilos para OpenLayers
import { Map, View } from "ol"; // Importa componentes de mapa y vista de OpenLayers
import TileLayer from "ol/layer/Tile"; // Importa la capa de teselas
import OSM from "ol/source/OSM"; // Importa la fuente de OpenStreetMap
import VectorLayer from "ol/layer/Vector"; // Importa la capa vectorial
import VectorSource from "ol/source/Vector"; // Importa la fuente vectorial
import GeoJSON from "ol/format/GeoJSON"; // Importa el formato GeoJSON
import { useGeographic } from "ol/proj"; // Importa el hook para la proyección geográfica
import { Style, Stroke, Fill } from "ol/style"; // Importa estilos para la capa
import * as turf from "@turf/turf"; // Importa la librería Turf.js para operaciones geoespaciales
import datos from "./denue_inegi_20_.json"; // Importa los datos en formato GeoJSON

function Mapa() {
  // Creamos una referencia para el elemento del mapa
  const mapRef = useRef();
  // Estado para el mapa
  const [map, setMap] = useState(null);
  // Estado para la fuente de datos vectoriales
  const [vectorSource, setVectorSource] = useState(null);
  // Estado para el rectángulo que selecciona los puntos
  const [rectangle, setRectangle] = useState(null);
  // Estado para los puntos que se encuentran dentro del rectángulo
  const [puntosEnCuadro, setPuntosEnCuadro] = useState([]);

  // Usamos la proyección geográfica
  useGeographic();

  // useEffect se ejecuta cuando el componente se monta
  useEffect(() => {
    // Creamos una fuente vectorial inicial a partir de los datos GeoJSON
    const initialVectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(datos), // Leemos las características desde el GeoJSON
    });

    // Creamos una capa vectorial a partir de la fuente
    const vectorLayer = new VectorLayer({
      source: initialVectorSource,
    });

    // Definimos los límites del rectángulo en coordenadas
    const bounds = [
      [-96.8, 17.0],
      [-96.8, 17.2],
      [-96.5, 17.2],
      [-96.5, 17.0],
      [-96.8, 17.0],
    ];
    // Creamos un polígono usando Turf.js a partir de los límites
    const rectanglePolygon = turf.polygon([bounds]);
    // Guardamos el polígono en el estado
    setRectangle(rectanglePolygon);

    // Leemos el polígono como una característica GeoJSON
    const polygonFeature = new GeoJSON().readFeature(rectanglePolygon, {
      dataProjection: "EPSG:4326", // Proyección de los datos
      featureProjection: "EPSG:4326", // Proyección de la característica
    });

    // Creamos una fuente vectorial para el rectángulo
    const rectangleSource = new VectorSource({
      features: [polygonFeature], // Usamos el polígono como característica
    });

    // Creamos una capa vectorial para el rectángulo
    const rectangleLayer = new VectorLayer({
      source: rectangleSource,
      style: new Style({
        // Estilo para el rectángulo
        stroke: new Stroke({
          // Contorno del rectángulo
          color: "blue", // Color del contorno
          width: 2, // Ancho del contorno
        }),
        fill: new Fill({
          // Relleno del rectángulo
          color: "rgba(0, 0, 255, 0.1)", // Color con transparencia
        }),
      }),
    });

    // Creamos el mapa inicial
    const initialMap = new Map({
      target: mapRef.current, // Referencia al contenedor del mapa
      layers: [
        // Capas del mapa
        new TileLayer({
          source: new OSM(), // Capa de fondo de OpenStreetMap
        }),
        vectorLayer, // Capa de los puntos
        rectangleLayer, // Capa del rectángulo
      ],
      view: new View({
        // Configuración de la vista
        center: [-96.769722, 17.066167], // Centro del mapa
        zoom: 9, // Nivel de zoom
      }),
    });

    // Actualizamos el estado del mapa y la fuente vectorial
    setMap(initialMap);
    setVectorSource(initialVectorSource);

    // Función de limpieza para cuando el componente se desmonta
    return () => {
      initialMap.setTarget(null); // Limpiamos el objetivo del mapa
      initialMap.getLayers().clear(); // Limpiamos las capas del mapa
      initialMap.dispose(); // Destruimos el mapa
    };
  }, []); // Solo se ejecuta al montar el componente

  // Función para buscar puntos dentro del rectángulo
  const buscarPuntosEnCuadro = () => {
    // Verificamos que el mapa y las fuentes están disponibles
    if (!map || !vectorSource || !rectangle) return;

    // Filtramos los puntos que están dentro del rectángulo
    const puntosEnCuadro = vectorSource.getFeatures().filter((feature) => {
      const point = turf.point(feature.getGeometry().getCoordinates()); // Creamos un punto de Turf.js
      return turf.booleanPointInPolygon(point, rectangle); // Comprobamos si el punto está dentro del polígono
    });

    // Actualizamos el estado con los puntos encontrados
    setPuntosEnCuadro(puntosEnCuadro);
  };

  return (
    <div>
      {/* Botón para buscar puntos dentro del cuadro */}
      <button onClick={buscarPuntosEnCuadro}>Buscar puntos en el cuadro</button>

      {/* Contenedor del mapa */}
      <div ref={mapRef} style={{ width: "100%", height: "500px" }} />

      {/* Sección para mostrar resultados */}
      <div style={{ marginTop: "20px" }}>
        <h3>Total de puntos en el cuadro: {puntosEnCuadro.length}</h3>
        <ul>
          {puntosEnCuadro.map((feature, index) => {
            const propiedades = feature.getProperties(); // Obtenemos las propiedades de la característica
            console.log("Propiedades del punto:", propiedades); // Mostramos las propiedades en la consola

            return (
              <li key={index}>
                {/* Mostramos el nombre del establecimiento o un mensaje alternativo */}
                {propiedades.nom_estab || "Sin nombre"} -{" "}
                {/* Mostramos la actividad o un mensaje alternativo */}
                {propiedades.nombre_act || "Actividad desconocida"}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export default Mapa; // Exportamos el componente Mapa
