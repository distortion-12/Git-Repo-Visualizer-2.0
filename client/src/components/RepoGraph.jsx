import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import Tooltip from './Tooltip';

const RepoGraph = ({ data, onNodeClick, searchTerm, isZoomEnabled, onNodeHover }) => {
  const svgRef = useRef();
  const zoomRef = useRef();
  const [tooltip, setTooltip] = useState({ isVisible: false, position: null, content: '' });

  const radiusScale = useMemo(() => {
    if (!data) return () => 5;
    const fileSizes = data.filter(d => d.type === 'blob' && d.size).map(d => d.size);
    return d3.scaleSqrt().domain([0, d3.max(fileSizes)]).range([4, 15]);
  }, [data]);

  const handleNodeHover = (event, d, isEntering) => {
    if (isEntering && d.type === 'blob') {
      const rect = svgRef.current.getBoundingClientRect();
      setTooltip({
        isVisible: true,
        position: { x: event.clientX, y: event.clientY },
        content: 'Click to see code and code explanation'
      });
      if (onNodeHover) onNodeHover(d, true);
    } else {
      setTooltip({ isVisible: false, position: null, content: '' });
      if (onNodeHover) onNodeHover(null, false);
    }
  };

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
  // svg defs for glow and gradients
  const defs = svg.append('defs');
  const glow = defs.append('filter').attr('id','glow');
  glow.append('feGaussianBlur').attr('stdDeviation', '3.5').attr('result','coloredBlur');
  const feMerge = glow.append('feMerge');
  feMerge.append('feMergeNode').attr('in','coloredBlur');
  feMerge.append('feMergeNode').attr('in','SourceGraphic');
  const grad = defs.append('linearGradient').attr('id','nodeGrad').attr('x1','0%').attr('y1','0%').attr('x2','100%').attr('y2','100%');
  grad.append('stop').attr('offset','0%').attr('stop-color','#34d399');
  grad.append('stop').attr('offset','100%').attr('stop-color','#60a5fa');
    const g = svg.append("g");
    
    zoomRef.current = d3.zoom().on("zoom", (event) => g.attr("transform", event.transform));
    
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.id).distance(50))
      .force("charge", d3.forceManyBody().strength(-120))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .attr("stroke", "#93c5fd")
      .attr("stroke-opacity", 0.35)
      .selectAll("line").data(links).join("line")
      .attr('stroke-dasharray', '4 6');
    
    const node = g.append("g").selectAll("g").data(nodes).join("g")
        .call(drag(simulation))
        .on("click", (event, d) => onNodeClick(d))
        .on("mouseover", (event, d) => handleNodeHover(event, d, true))
        .on("mouseout", (event, d) => handleNodeHover(event, d, false))
        .style("cursor", d => d.type === 'blob' ? "pointer" : "default");

    node.append("circle")
      .attr("r", d => d.type === 'blob' ? radiusScale(d.size) : (d.id === 'root' ? 10 : 7))
      .attr('fill','url(#nodeGrad)')
      .attr("stroke", "#c4b5fd").attr("stroke-width", 1)
      .style('filter','url(#glow)')
      .on('mouseover', function() { d3.select(this).transition().duration(150).attr('r', +d3.select(this).attr('r') + 3); })
      .on('mouseout', function() { d3.select(this).transition().duration(150).attr('r', +d3.select(this).attr('r') - 3); });

    node.append("text").text(d => d.name).attr("x", 12).attr("y", 4).style("font-size", "10px").style('fill','#cbd5e1').style('text-shadow','0 0 6px rgba(99,102,241,0.6)');

    let phase = 0;
    simulation.on("tick", () => {
      phase += 0.02;
      link
        .attr("x1", d => d.source.x).attr("y1", d => d.source.y).attr("x2", d => d.target.x).attr("y2", d => d.target.y)
        .attr('stroke-dashoffset', phase * 20);
      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    function drag(sim) {
      function dragstarted(event, d) { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; }
      function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
      function dragended(event, d) { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }
      return d3.drag().on("start", dragstarted).on("drag", dragged).on("end", dragended);
    }
  }, [data, onNodeClick, radiusScale, handleNodeHover]);

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

  return (
    <div className="relative">
      <div ref={svgRef} className="w-full h-full" />
      <Tooltip 
        isVisible={tooltip.isVisible} 
        position={tooltip.position} 
        content={tooltip.content} 
      />
    </div>
  );
};

export default RepoGraph;