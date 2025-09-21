import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import path from 'path-browserify';
import Tooltip from './Tooltip';

const TreeView = ({ data, onNodeClick, onRightClick, searchTerm, isZoomEnabled, highlightedDeps, selectedFilePath, onNodeHover }) => {
  const svgRef = useRef();
  const zoomRef = useRef();
  const [tooltip, setTooltip] = useState({ isVisible: false, position: null, content: '' });

  const handleNodeHover = (event, d, isEntering) => {
    if (isEntering && d.data && d.data.type === 'blob') {
      setTooltip({
        isVisible: true,
        position: { x: event.clientX, y: event.clientY },
        content: 'Click to see code and code explanation'
      });
      if (onNodeHover) onNodeHover(d.data, true);
    } else {
      setTooltip({ isVisible: false, position: null, content: '' });
      if (onNodeHover) onNodeHover(null, false);
    }
  };

  const root = useMemo(() => {
    if (!data || data.length === 0) return null;
    
    const validData = data.filter(d => d && d.path);
    const hierarchicalData = [{ path: 'root', type: 'tree' }, ...validData];

    try {
      return d3.stratify().id(d => d.path).parentId(d => {
        if (d.path === 'root') return null;
        const lastSlash = d.path.lastIndexOf('/');
        return lastSlash === -1 ? 'root' : d.path.substring(0, lastSlash);
      })(hierarchicalData);
    } catch (error) {
      console.error("Failed to create tree structure:", error);
      return null;
    }
  }, [data]);

  useEffect(() => {
    if (!root) {
        d3.select(svgRef.current).selectAll("*").remove();
        return;
    };

    const container = d3.select(svgRef.current);
    container.selectAll("*").remove();

    const width = svgRef.current.clientWidth;
    const dynamicHeight = Math.max(800, root.descendants().length * 20);

    const treeLayout = d3.tree().size([width, dynamicHeight - 200]);
    treeLayout(root);

  const svg = container.append("svg").attr("width", width).attr("height", dynamicHeight).attr("viewBox", [0, 0, width, dynamicHeight]);
  const defs = svg.append('defs');
  const glow = defs.append('filter').attr('id','treeGlow');
  glow.append('feGaussianBlur').attr('stdDeviation','2.5').attr('result','coloredBlur');
  const fm = glow.append('feMerge'); fm.append('feMergeNode').attr('in','coloredBlur'); fm.append('feMergeNode').attr('in','SourceGraphic');
    const g = svg.append("g").attr("transform", `translate(0, 50)`);

    zoomRef.current = d3.zoom().extent([[0, 0], [width, dynamicHeight]]).scaleExtent([0.5, 3]).on("zoom", (event) => {
        g.attr("transform", event.transform);
    });

    g.append("g").attr("fill", "none").attr("stroke", "#93c5fd").attr("stroke-opacity", 0.35).attr("stroke-width", 1.2).style('filter','url(#treeGlow)')
      .selectAll("path").data(root.links()).join("path")
      .attr("d", d3.linkVertical().x(d => d.x).y(d => d.y));

    const node = g.append("g").selectAll("g").data(root.descendants()).join("g")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .on("click", (event, d) => onNodeClick(d.data))
      .on("contextmenu", (event, d) => onRightClick(event, d))
      .on("mouseover", (event, d) => handleNodeHover(event, d, true))
      .on("mouseout", (event, d) => handleNodeHover(event, d, false))
      .style("cursor", d => d.data && d.data.type === 'blob' ? "pointer" : "default");

  node.append("circle").attr("r", d => d.data && d.data.path === 'root' ? 8 : 5).attr('fill', '#60a5fa').attr('stroke', '#a78bfa').attr('stroke-width', 1).style('filter','url(#treeGlow)');

    node.append("text")
      .attr("dy", "0.31em")
      .attr("x", d => d && d.children ? -8 : 8)
      .attr("text-anchor", d => d && d.children ? "end" : "start")
      .text(d => d.data && d.data.path ? d.data.path.split('/').pop() : "")
      .style("font-size", "12px").style("fill", "#e5e7eb").style("paint-order", "stroke").style("stroke", "rgba(99,102,241,0.5)").style("stroke-width", "2px");

  node.selectAll("circle").attr("fill", d => d && d.children ? "#f59e0b" : "#34d399");
  node.selectAll("text").attr("fill", "#cbd5e1");

  }, [root, onNodeClick, onRightClick, handleNodeHover]);

  useEffect(() => {
    const svg = d3.select(svgRef.current).select("svg");
    if (svg.empty()) return;
    if (isZoomEnabled) {
      svg.call(zoomRef.current).style("cursor", "grab");
    } else {
      svg.on('.zoom', null).style("cursor", "default");
    }
  }, [isZoomEnabled]);

  useEffect(() => {
    d3.select(svgRef.current).selectAll("g g")
      .each(function(d) {
        if (!d || !d.data) return;

        const currentFileDir = selectedFilePath ? path.dirname(selectedFilePath) : '';
        
        // --- THIS IS THE CRITICAL FIX ---
        // We now check if `highlightedDeps` is an array before calling `.some()` on it.
        const isDep = Array.isArray(highlightedDeps) && highlightedDeps.some(dep => {
            const absoluteDepPath = path.resolve(currentFileDir, dep);
            return d.data.path?.startsWith(absoluteDepPath.substring(1));
        });

        const isMatch = searchTerm && d.data.path && d.data.path.toLowerCase().includes(searchTerm.toLowerCase());
        const isSelected = d.data.path === selectedFilePath;

        let color = d.children ? "#f59e0b" : "#10b981";
        if (d.data.path === 'root') color = '#4f46e5';
        if (d.data.status === 'added') color = "#22c55e";
        if (d.data.status === 'modified') color = "#eab308";
        if (d.data.status === 'removed') color = "#7f1d1d";
        if (isDep) color = "#34d399";
        if (isMatch) color = "#ef4444";
        if (isSelected) color = "#8b5cf6";

        d3.select(this).select("circle")
          .transition().duration(200)
          .attr("fill", color)
          .attr("r", isMatch || isSelected ? 8 : (d.data.path === 'root' ? 8 : 5));
        d3.select(this).select("text")
          .transition().duration(200)
          .attr("font-weight", isMatch || isSelected ? "bold" : "normal");
      });
  }, [searchTerm, highlightedDeps, selectedFilePath]);

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

export default TreeView;