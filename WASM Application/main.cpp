#include <thread>
#include <vector>
#include <chrono>
#include <iostream>

#include <glm/glm.hpp>
#include <emscripten/bind.h>

using namespace std::chrono;
using namespace std::chrono_literals;

struct SimulationParameters {
public:
    float G = 2.0f;
    float dt = 0.005f;
    float ESP2 = 0.2f;
    float damping = 0.999998f;
};
SimulationParameters params;

std::map<std::string, void *> buffers;
std::map<std::string, int> bufferLengths;

std::vector<std::thread> workers;
std::vector<bool> workersState;

extern "C" {
void declareResource(const uintptr_t &data, const int &count, const std::string &as) {
    buffers[as] = reinterpret_cast<void *>(data);
    bufferLengths[as] = count;
}

void stage1(int from, int to) {
    for (int i = 0; i < 6; i++) {
        workersState.emplace_back(false);
        workers.emplace_back([from, to, i]() {
            std::cout << "stage 1 started" << std::endl;

            auto *particlesPositions = reinterpret_cast<glm::vec4 *>(buffers["positions"]);
            auto *particlesVelocities = reinterpret_cast<glm::vec4 *>(buffers["velocities"]);

            for (int idx = from + 1; idx < to; idx += 6) {
                glm::vec4 point = particlesPositions[idx];

                glm::vec3 accumulatedVelocity{0.0f};
                for (int posIdx = 0; posIdx < bufferLengths["positions"]; posIdx++) {
                    auto &pos = particlesPositions[posIdx];

                    auto r = glm::vec3{pos} - glm::vec3{point};
                    float impDistance = pow(dot(r, r) + params.ESP2, 3.0f);
                    float invDistanceSquare = glm::inversesqrt(impDistance);

                    accumulatedVelocity += r * invDistanceSquare;
                }

                glm::vec3 resultedVelocity = params.dt * accumulatedVelocity * params.G +
                                             glm::vec3{particlesVelocities[idx]} * params.damping;
                particlesVelocities[idx] = glm::vec4{resultedVelocity, 0.0f};
            }

            workersState[i] = true;
        });
    }

    for (int i = 0; i < 6; i++)
        workers[i].join();

    bool status = true;
    while (true) {
        for (int i = 0; i < 6; i++)
            if (!workersState[i]) status = false;
        if (status) break;
        status = true;
        std::this_thread::sleep_for(10ms);
    }

    workersState.clear();
    workers.clear();
}

void stage2(int from, int to) {
    std::cout << "stage 2 started" << std::endl;

    for (int i = 0; i < 6; i++) {
        workersState.emplace_back(false);
        workers.emplace_back([from, to, i]() {
            auto *particlesPositions = reinterpret_cast<glm::vec4 *>(buffers["positions"]);
            auto *particlesVelocities = reinterpret_cast<glm::vec4 *>(buffers["velocities"]);

            for (int idx = from + i; idx < to; idx += 6) {
                glm::vec4 position = particlesPositions[idx];
                particlesPositions[idx] = glm::vec4{
                        glm::vec3{position} + params.dt * glm::vec3{particlesVelocities[idx]},
                        position.w
                };
            }
        });

        workersState[i] = true;
    }

    for (int i = 0; i < 6; i++)
        workers[i].join();

    bool status = true;
    while (true) {
        for (int i = 0; i < 6; i++)
            if (!workersState[i]) status = false;
        if (status) break;
        status = true;
        std::this_thread::sleep_for(10ms);
    }

    workersState.clear();
    workers.clear();
}
}

EMSCRIPTEN_BINDINGS(ExecutionModule) {
    emscripten::function("declareResource", &declareResource);

    emscripten::function("stage1", &stage1);
    emscripten::function("stage2", &stage2);
}