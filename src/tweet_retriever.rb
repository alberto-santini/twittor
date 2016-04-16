#!/usr/bin/env ruby

require 'twitter'
require 'json'

class TweetWithData
  attr_accessor :user, :text, :mentions, :hashtags
  
  def initialize(user:, text:, mentions:, hashtags:)
    @user = user
    @text = text
    @mentions = mentions
    @hashtags = hashtags
  end
  
  def ==(other)
    other.class == self.class && other.user == user && other.text == text
  end
  
  alias_method :eql, :==
  
  def to_json(options = nil)
    {
      user: user,
      text: text,
      mentions: mentions,
      hashtags: hashtags
    }.to_json(options)
  end
end

class TweetRetriever
  def initialize
    @client = Twitter::REST::Client.new do |config|
      config.consumer_key    = "***REMOVED***"
      config.consumer_secret = "***REMOVED***"
    end
  end
  
  def retrieve_by_hashtag(hashtag:)
    results = @client.search("##{hashtag}")
    results_ary = Array.new
    tweets = Array.new
    
    begin
      results_ary = results.to_a
    rescue Twitter::Error::TooManyRequests => error
      sleep_time = error.rate_limit.reset_in + 1
      
      puts "Too many requests, sleeping for #{sleep_time} seconds"
      sleep sleep_time
      
      retry
    rescue
      puts "Error in retrieving tweets for hashtag ##{hashtag}"
      return Array.new
    end

    results_ary.each do |tweet|
      tweets << TweetWithData.new(
        user: tweet.user.screen_name,
        text: tweet.text,
        mentions: tweet.user_mentions.map{|m| m.screen_name},
        hashtags: tweet.hashtags.map{|h| h.text}
      )
    end
    
    return tweets
  end
  
  def retrieve_by_hashtags(hashtags:)
    # Deal with the limit case in which only 1 hashtag is passed (outside an enumerable)
    hashtags = [hashtags] unless hashtags.is_a? Enumerable
    
    tweets = Array.new
    
    hashtags.each do |h|
      tweets = tweets + retrieve_by_hashtag(hashtag: h)
    end
    
    return tweets.uniq
  end
end

retriever = TweetRetriever.new
data = retriever.retrieve_by_hashtags(hashtags: ["orms", "orblog", "thisisor"])

File.open("results.json", "w"){|file| file.write(data.to_json)}