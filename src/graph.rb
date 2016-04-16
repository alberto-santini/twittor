#!/usr/bin/env ruby

require 'json'
require 'set'

class Arc
  attr_accessor :source, :target, :strength, :tags
  
  def initialize(source:, target:, strength: 1, tags: Set.new)
    @source = source
    @target = target
    @strength = strength
    @tags = tags
  end
  
  def contains?(user)
    (user == source) or (user == target)
  end
end

class Graph
  attr_accessor :nodes, :arcs
  
  def initialize(nodes: Set.new, arcs: Array.new)
    @nodes = nodes
    @arcs = arcs
  end
  
  def self.build_from_tweet_datafile(filename:)
    data = JSON.parse(File.read(filename))
    nodes = Set.new
    arcs = Array.new
    
    data.each do |tweet|
      # Remove self-citations :)
      tweet['mentions'].delete(tweet['user'])
      
      # Skip if the tweet's author didn't mention anyone (beside himself)
      next if tweet['mentions'].is_a?(Enumerable) and tweet['mentions'].empty?
      
      # Add tweet's author to nodes
      nodes << tweet['user']
      
      # Add all mentioned users to nodes
      nodes.merge tweet['mentions']
      
      # Add (or update) an arc for every mentioned user
      tweet['mentions'].each do |m|
        # For this particular application, we don't care about the direction of the arc
        arc = arcs.find {|a| a.contains?(tweet['user']) and a.contains?(m)}
        
        htags = tweet['hashtags']
        
        if arc
          # Arc already exists, update:
          arc.strength = arc.strength + 1
          arc.tags.merge(htags) if htags.is_a? Enumerable
        else
          # Create new arc:
          # Take the tags, if any
          tags = (htags.is_a?(Enumerable) ? Set.new(htags) : Set.new)
          
          arcs << Arc.new(
            source: tweet['user'],
            target: m,
            strength: 1,
            tags: tags
          )
        end
      end
    end
    
    return Graph.new(nodes: nodes, arcs: arcs)
  end
  
  def print
    @arcs.each do |a|
      puts "[#{a.source}, #{a.target}] of strength #{a.strength} - tags: #{a.tags.to_a.join(", ")}"
    end
  end
  
  # Tells how many arcs contain the user
  def importance(user:)
    @arcs.count{|a| a.source == user or a.target == user}
  end
  
  # Lists all users directly connected with the user via an arc
  def neighbours(user:)
    ngb = Set.new
    
    @arcs.each do |arc|
      if arc.source == user
        ngb << arc.target
      elsif arc.target == user
        ngb << arc.source
      end
    end
    
    return ngb.to_a
  end
  
  # Lists all hashtags present in tweets where the user is either author or mentioned
  def tags(user:)
    tgs = Set.new
    
    @arcs.each do |arc|
      tgs = tgs.merge(arc.tags) if arc.contains?(user)
    end
    
    return tgs.to_a
  end
  
  def print_d3_json
    # Outputs json data that can be easily read by d3.js
    d3data = Hash.new
    
    nodes_ary = @nodes.to_a
    
    d3data['nodes'] = nodes_ary.map do |twitter_user|
      {
        name: twitter_user,
        importance: importance(user: twitter_user),
        neighbours: neighbours(user: twitter_user),
        tags: tags(user: twitter_user)
      }
    end
    
    d3data['links'] = @arcs.map do |arc|
      {
        source: nodes_ary.index(arc.source),
        target: nodes_ary.index(arc.target),
        strength: arc.strength,
        tags: arc.tags.to_a
      }
    end
    
    puts JSON.pretty_generate(d3data)
  end
end

g = Graph.build_from_tweet_datafile(filename: "results.json")
g.print_d3_json