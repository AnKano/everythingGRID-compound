cmake_minimum_required(VERSION 3.21)
project(test_application)

set(CMAKE_CXX_STANDARD 17)

set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/lib)
set(CMAKE_LIBRARY_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/lib)
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY ${CMAKE_SOURCE_DIR}/server)

set(CMAKE_EXECUTABLE_SUFFIX .js)

add_subdirectory(third-party/glm)

add_executable(test_application main.cpp)

target_link_libraries(test_application glm embind)
target_compile_options(test_application PRIVATE "-pthread")
target_link_options(test_application PUBLIC "SHELL: -s ALLOW_MEMORY_GROWTH=0 -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=8 -s TOTAL_MEMORY=256MB")
#target_link_options(test_application PUBLIC "SHELL: -s MODULARIZE=1 -s 'EXPORT_NAME=\"ExecutionModule\"")