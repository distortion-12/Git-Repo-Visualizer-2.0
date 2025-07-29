import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

const RepoGraph = ({ data, onNodeClick, searchTerm, isZoomEnabled }) => {
  const svgRef = useRef();
  const zoomRef = useRef();

  const radiusScale = useMemo(() => {
    if (!data) return () => 5;
    const fileSizes = data.filter(d => d.type === 'blob' && d.size).map(d => d.size);
    return d3.scaleSqrt().domain([0, d3.max(fileSizes)]).range([4, 15]);
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();

    const nodeMap = new Map();
    const links = [];
    nodeMap.set('root', { id: 'root', type: 'tree', name: 'root' });
    data.forEach(item => {
      const parts = item.path.split('/');
      let currentPath = 'root';
      parts.forEach((part, i) => {
        const isLastPart = i === parts.length - 1;
        const childPath = isLastPart ? item.path : parts.slice(0, i + 1).join('/');
        const childType = isLastPart ? item.type : 'tree';
        if (!nodeMap.has(childPath)) {
          nodeMap.set(childPath, { ...item, id: childPath, name: part });
        }
        if (!links.some(l => l.source === currentPath && l.target === childPath)) {
          links.push({ source: currentPath, target: childPath });
        }
        currentPath = childPath;
      });
    });
    const nodes = Array.from(nodeMap.values());

    const width = svgRef.current.clientWidth;
    const height = 600;
    const svg = container.append("svg").attr("viewBox", [0, 0, width, height]);
    const g = svg.append("g");
    
    zoomRef.current = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
    
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g").attr("stroke", "#9ca3af").attr("stroke-opacity", 0.6).selectAll("line").data(links).join("line");
    
    const node = g.append("g").selectAll("g").data(nodes).join("g")
        .call(drag(simulation))
        .on("click", (event, d) => onNodeClick(d))
        // --- THIS IS THE NEW LINE ---
        .style("cursor", d => d.type === 'blob' ? "pointer" : "default");

    node.append("circle")
      .attr("r", d => d.type === 'blob' ? radiusScale(d.size) : (d.id === 'root' ? 10 : 7))
      .attr("stroke", "#fff").attr("stroke-width", 1.5);

    node.append("text").text(d => d.name).attr("x", 12).attr("y", 4).style("font-size", "10px");

    simulation.on("tick", () => {
      link.attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function drag(sim) {
      function dragstarted(event, d) { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
      function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
      function dragended(event, d) { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
  }, [data, onNodeClick, radiusScale]);

  useEffect(() => {
    const svg = d3.select(svgRef.current).select("svg");
    if (svg.empty()) return;

    if (isZoomEnabled) {
      svg.call(zoomRef.current);
      svg.style("cursor", "grab");
    } else {
      svg.on('.zoom', null);
      svg.style("cursor", "default");
    }
  }, [isZoomEnabled]);

  useEffect(() => {
    d3.select(svgRef.current).selectAll("circle")
      .transition().duration(200)
      .attr("fill", d => {
          const isMatch = searchTerm && d.id && d.id.toLowerCase().includes(searchTerm.toLowerCase());
          if (isMatch) return "#ef4444";
          return d.id === 'root' ? '#4f46e5' : (d.type === 'tree' ? '#f59e0b' : '#10b981');
      })
      .attr("r", d => {
          const isMatch = searchTerm && d.id && d.id.toLowerCase().includes(searchTerm.toLowerCase());
          const baseRadius = d.type === 'blob' ? radiusScale(d.size) : (d.id === 'root' ? 10 : 7);
          return isMatch ? baseRadius + 3 : baseRadius;
      });
  }, [searchTerm, radiusScale]);

  return <div ref={svgRef} className="w-full h-full" />;
};

export default RepoGraph;