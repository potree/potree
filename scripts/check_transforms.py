import numpy as np
import matplotlib.pyplot as plt

# Check that choice of intermediate frame is arbitrary when computing relative transforms:
scale = 20
def random_point(scale=20):
	return scale*np.random.rand(2).reshape([2,1]) - scale/2

def getSE2(tx, theta):
	return np.array([[np.cos(theta), -np.sin(theta), tx[0]],
					 [np.sin(theta),  np.cos(theta), tx[1]],
					 [0, 			  0, 			 1   ]])



A = random_point()
B = random_point()

p1 = np.zeros_like(A)
p2 = random_point()

# Transform A to B:
P_1_from_A = getSE2(tx=p2-A, theta=0)
P_B_from_1 = getSE2(tx=B-p2, theta=0)

intermediate = np.dot(P_1_from_A, np.vstack([A, [1]]))
B_1 = np.dot(P_B_from_1, intermediate)

# import pdb
# pdb.set_trace()

plt.plot(A[0], A[1], 'r.', label='A')
plt.plot(B[0], B[1], 'bo', label='B')
plt.plot(B_1[0], B_1[1], 'r*', label='final from A to B')
plt.plot(intermediate[0], intermediate[1], 'rx', label='intermediate from A to p1')



plt.xlim([-scale/2, scale/2])
plt.ylim([-scale/2, scale/2])
plt.legend()
plt.grid()
plt.show()






