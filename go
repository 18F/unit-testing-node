#! /usr/bin/env ruby

require 'English'
require 'fileutils'

Dir.chdir File.dirname(__FILE__)

def try_command_and_restart(command)
  exit $CHILD_STATUS.exitstatus unless system command
  exec({ 'RUBYOPT' => nil }, RbConfig.ruby, *[$PROGRAM_NAME].concat(ARGV))
end

begin
  require 'bundler/setup' if File.exist? 'Gemfile'
rescue LoadError
  try_command_and_restart 'gem install bundler'
rescue SystemExit
  try_command_and_restart 'bundle install'
end

begin
  require 'go_script'
rescue LoadError
  try_command_and_restart 'gem install go_script' unless File.exist? 'Gemfile'
  abort "Please add \"gem 'go_script'\" to your Gemfile"
end

require 'guides_style_18f'

extend GoScript
check_ruby_version '2.2.3'

command_group :tutorial, 'Tutorial commands'

def restore_initial_state
  Dir[File.join('exercise', '**', '*')].each do |old_file|
    FileUtils.rm(old_file) if File.file? old_file
  end
  replace_exercise_files('.exercise-init')
end

def replace_exercise_files(source_dir)
  Dir[File.join(source_dir, '**', '*')].each do |source|
    target = source.sub(source_dir, 'exercise')
    if File.file?(source)
      FileUtils.cp(source, target)
    elsif !Dir.exist?(target)
      FileUtils.mkdir(target)
    end
  end
end

def_command('start-over'.to_sym,
  'Restore the initial state of the exercise files') do
  restore_initial_state
  exec_cmd 'npm test'
  puts 'Restoration of starting state successful'
end

SOLUTION_CHAPTERS = Dir[File.join('solutions', '*')].map do |subdir|
  return unless File.directory? subdir
  chapter = File.basename(subdir).split('-', 2)[1]
  [chapter, subdir] if chapter
end.compact

SOLUTION_CHAPTERS.each_index do |chapter_index|
  chapter, _ = SOLUTION_CHAPTERS[chapter_index]
  target = "set-#{chapter}".to_sym

  def_command(target, "Set up the files for the #{chapter} chapter") do
    restore_initial_state
    SOLUTION_CHAPTERS.slice(0, chapter_index).each do |_, previous_subdir|
      replace_exercise_files(previous_subdir)
    end
    exec_cmd 'npm test'
    puts "Restoration of #{chapter} chapter state successful"
  end
end

def_command('set-complete'.to_sym,
  'Copy the complete solution into the exercise dir') do
  restore_initial_state
  replace_exercise_files(File.join('solutions', 'complete'))
  exec_cmd 'npm test'
  puts 'Restoration of complete solution state successful'
end

command_group :dev, 'Development commands'

def_command :update_nav, 'Update the \'navigation:\' data in _config.yml' do
  GuidesStyle18F.update_navigation_configuration Dir.pwd
end

def_command :update_theme, 'Update the guides_style_18f gem' do
  GuidesStyle18F.update_theme
end

def_command :update_gems, 'Update Ruby gems' do |gems|
  update_gems gems
end

def_command :serve, 'Serve the site at localhost:4000' do |args|
  serve_jekyll args
end

def_command :build, 'Build the site' do |args|
  build_jekyll args
end

def_command :ci_build, 'Run all continuous integration checks' do
  exec_cmd 'npm run lint-all'
  exec_cmd 'npm test'
  exec_cmd 'npm run test-all'
  exec_cmd 'solutions/complete/test/hubot-smoke-test.bash'
  build
end

execute_command ARGV
