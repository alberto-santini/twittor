var width = 800;
var height = 800;
var node_colour = "#C93C00";
var node_highlighted_colour = "#FFC200";
var node_border_colour = "#FFFFFF";
var node_highlighted_border_colour = "#0027FF";
var edge_colour = "#E88801";
var edge_highlited_colour = "#C93C00";

var default_expander_options = {
    slicePoint: 160,
    preserveWords: true,
    expandText: 'more',
    expandPrefix: '&hellip; ',
    userCollapse: true,
    userCollapseText: 'less',
    expandEffect: 'fadeIn',
    collapseEffect: 'fadeOut'
};

var force = d3.layout.force()
    .charge(function(d) { return -200 * d.importance; })
    .linkStrength(function(d) { return d.strength; })
    .linkDistance(100)
    .friction(0.5)
    .size([width, height]);
    
var svg = d3.select("#chart-area").append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", "0 0 " + width + " " + height)
    .attr("preserveAspectRatio", "xMidYMid");
    
var nodes = [];
var links = [];
var hashtags = [];

$(document).ready(function() {
    d3.json("d3data.json", function(error, graph) {
        if(error) {
            throw error;
        }

        nodes = graph.nodes;
        links = graph.links;

        // Get all hashtags
        $.each(links, function(i, l) {
            $.merge(hashtags, l.tags);
        });
        // Make them unique      
        hashtags = $.grep(hashtags, function(h, i) {
            return i == $.inArray(h, hashtags);
        });

        force
            .nodes(nodes)
            .links(links)
            .start();

        var link = svg.selectAll(".link")
            .data(links)
            .enter()
            .append("line")
            .attr("class", "link")
            .attr("data-tags", function(d) { return d.tags; })
            .style("stroke", edge_colour)
            .style("stroke-opacity", 0.5)
            .style("stroke-width", function(d) { return d.strength; });

        var node = svg.selectAll(".node")
            .data(nodes)
            .enter()
            .append("circle")
            .attr("class", "node")
            .attr("r", function(d) { return Math.sqrt(10 * d.importance); })
            .attr("data-user", function(d) { return d.name; })
            .style("fill", node_colour)
            .style("stroke", node_border_colour)
            .style("stroke-width", "2px")
            .call(force.drag);
  
        var tooltip = d3.select("body")
            .append("div")
            .style("position", "absolute")
            .style("z-index", "10")
            .style("visibility", "hidden")
            .style("background-color", "#730046")
            .style("color", "white")
            .style("padding", "5px")
            .html("username goes here");

        node.append("title")
            .text(function(d) { return d.name; });

        node.on("click", function(d) {
            select_node(d.name);
        }).on("mouseover", function(d) {
            tooltip
                .html("<strong>" + d.name + "</strong>")
                .style("visibility", "visible");
        }).on("mousemove", function() {
            tooltip
                .style("top", (d3.event.pageY - 10) + "px")
                .style("left", (d3.event.pageX + 10) + "px");
        }).on("mouseout", function () {
            tooltip
                .html("username goes here")
                .style("visibility", "hidden");
        });

        force.on("tick", function() {
            link.attr("x1", function(d) { return d.source.x; })
                .attr("y1", function(d) { return d.source.y; })
                .attr("x2", function(d) { return d.target.x; })
                .attr("y2", function(d) { return d.target.y; });

            node.attr("cx", function(d) { return d.x; })
                .attr("cy", function(d) { return d.y; });
        });

        $("#all-users")
            .html(
                "<strong>All users</strong>: " +
                $.map(nodes, function(user) {
                    return link_for_user(user.name);
                }).join(", ")
            )
            .expander(default_expander_options);

        $("#all-tags")
            .html(
                "<strong>All hashtags</strong>: " +
                $.map(hashtags, function(tag) {
                    return link_for_tag(tag);
                }).join(", ")
            )
            .expander(default_expander_options);
    });
    
    $(window).on("resize", function() {
        var chart = $("#chart-area > svg");
        var aspect = width / height;
        var targetWidth = chart.parent().width();
    
        chart.attr("width", targetWidth);
        chart.attr("height", targetWidth / aspect);
    });
    
    $("#clear-user").click(function() {
        select_node("");
    });
    
    $("#clear-hashtag").click(function() {
        highlight_tag("");
    });
});

var select_node = function(username) {
    var datum;
    
    svg.selectAll(".node").each(function(d, i) {
        var e = d3.select(this);
        
        if(e.attr("data-user") == username) {
            e.style({'fill': node_highlighted_colour, 'stroke': node_highlighted_border_colour, 'stroke-width': '5px'});
            datum = d;
        } else {
            e.style({'fill': node_colour, 'stroke': node_border_colour, 'stroke-width': '2px'});
        }
    });
    
    update_info(datum);
}

var highlight_tag = function(tagname) {
    svg.selectAll(".link").each(function(d, i) {
        var e = d3.select(this);
        var tags = e.attr("data-tags").split(",");
        
        if($.inArray(tagname, tags) != -1) {
            e.style({'stroke': edge_highlited_colour, 'stroke-opacity': 1.0});
        } else {
            e.style({'stroke': edge_colour, 'stroke-opacity': 0.5});
        }
    });
}

var link_for_user = function(username) {
    return '<a href="javascript:select_node(\'' + username + '\')">' + username + '</a>';
}

var link_for_tag = function(tag) {
    return '<a href="javascript:highlight_tag(\'' + tag + '\')">' + tag + '</a>';
}

var update_info = function(d) {
    if(typeof d == "undefined") {
        $("#user-name").text("");
        $("#user-importance").text("");
        $("#user-neighbours").text("");
        $("#user-tags").text("");
        return;
    }
    
    $("#user-name").text(d.name);
    
    $("#user-importance").text(d.importance);
    
    $("#user-neighbours")
        .expander('destroy')
        .html(
            $.map(d.neighbours, function(neighbour) {
                return link_for_user(neighbour);
            }).join(", ")
        )
        .expander(default_expander_options);

    $("#user-tags")
        .expander('destroy')
        .html(
            $.map(d.tags, function(tag) {
                return link_for_tag(tag);
            }).join(", ")
        )
        .expander(default_expander_options);
}